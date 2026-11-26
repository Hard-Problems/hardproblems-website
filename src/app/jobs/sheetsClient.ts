// Reads the jobs spreadsheet through the Google Sheets API, authenticating
// with Workload Identity Federation.
//
// Why this exists: the CSV export endpoint only answers an anonymous
// request while the document is shared "anyone with the link", and that
// setting exposes the whole workbook — not just the jobs tab the site
// uses, but every other tab, the Sheets UI at /edit, and the revision
// history — to anyone who has ever seen the URL. Authenticating lets the
// document be set to "Restricted" and shared with one machine identity.
//
// Why federation rather than a service-account key: a downloaded JSON key
// is a long-lived secret that has to be stored, rotated and kept out of
// logs, which is why our Google org policy
// (iam.disableServiceAccountKeyCreation) refuses to issue one. Instead
// Vercel mints a short-lived OIDC token for the running function, Google's
// STS exchanges it for a token that impersonates the service account, and
// nothing persistent is stored anywhere. None of the env vars below are
// secret.
//
// Only /api/cron/sync-jobs needs this in normal operation; the board
// itself reads the Supabase snapshot that cron writes. The direct-sheet
// fallback in fetchJobs() is the other caller, and only when there is no
// usable snapshot. There is no unauthenticated path left: without this
// the sheet simply cannot be read.
//
// Setup is in .env.local.example; the Vercel side is documented at
// https://vercel.com/docs/oidc/gcp

import { ExternalAccountClient } from 'google-auth-library';
import type { BaseExternalAccountClient } from 'google-auth-library';
import { getVercelOidcToken } from '@vercel/oidc';

// The jobs workbook.
const SHEET_ID = '1Vpvb3T_wVAdtvhxuYfg4YBYysE7_hE1qmP1qyiZWfk8';

// The tab the board reads — gid=0, the first one. Named rather than
// numbered because the values API addresses tabs by title. If the tab is
// ever renamed in the sheet, this must change with it: the API answers a
// missing title with a 400, which is called out in the error path below.
const SHEET_RANGE = 'Sheet1';

// Read-only, so the impersonated token cannot write to the sheet even if
// the service account were later granted more.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

type FederationConfig = {
  projectNumber: string;
  serviceAccountEmail: string;
  poolId: string;
  providerId: string;
};

function federationConfig(): FederationConfig | null {
  const projectNumber = process.env.GCP_PROJECT_NUMBER?.trim();
  const serviceAccountEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL?.trim();
  const poolId = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID?.trim();
  const providerId = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID?.trim();

  if (!projectNumber || !serviceAccountEmail || !poolId || !providerId) {
    return null;
  }
  return { projectNumber, serviceAccountEmail, poolId, providerId };
}

// Whether the federation env vars are all present. Reported by the sync
// endpoint so "nobody configured this" is distinguishable from "the read
// failed" — very different things to go and fix.
export function sheetsApiConfigured(): boolean {
  return federationConfig() !== null;
}

// Built once per process. The client holds the access token it gets back
// and refreshes it on expiry, so a warm instance does not re-run the
// exchange on every sync.
let client: BaseExternalAccountClient | null = null;

function authClient(
  config: FederationConfig
): BaseExternalAccountClient | null {
  if (client) return client;

  // Note `//iam.googleapis.com/...` with no scheme: this is the audience
  // in the form STS expects, which is not the same string as the `aud`
  // claim inside the OIDC token itself.
  const audience =
    `//iam.googleapis.com/projects/${config.projectNumber}` +
    `/locations/global/workloadIdentityPools/${config.poolId}` +
    `/providers/${config.providerId}`;

  const created = ExternalAccountClient.fromJSON({
    type: 'external_account',
    audience,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: 'https://sts.googleapis.com/v1/token',
    service_account_impersonation_url:
      `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/` +
      `${config.serviceAccountEmail}:generateAccessToken`,
    subject_token_supplier: {
      // Vercel mints this per invocation. It is only available to code
      // running in a Vercel deployment — locally it throws, which is why
      // local development reads the Supabase snapshot instead.
      getSubjectToken: () => getVercelOidcToken()
    }
  });

  if (!created) {
    // The caller turns this into the reason it reports; no warn here, or
    // the same sentence lands in the log twice.
    return null;
  }

  // Least privilege on the impersonated token: without this the
  // impersonation asks for the full cloud-platform scope.
  created.scopes = SCOPES;
  client = created;
  return client;
}

/**
 * The outcome of a read: the rows, or null plus why.
 *
 * The reason is carried rather than only logged because the log line it
 * used to be lived in Vercel's runtime logs and nowhere else, while the
 * Slack alert that actually reaches a person said only
 * `configured: true`. That rules out "nobody set this up" and leaves
 * every other cause — the four below — indistinguishable, three of
 * which need a fix and one of which needs nothing. On 2026-11-23 a
 * single 03:30 failure took a dig through the logs to classify, and the
 * logs are the one place a 3am alert cannot be read from.
 *
 * Safe to put in an alert: it comes from describe(), which deliberately
 * drops the response headers and so the bearer token.
 */
export type SheetReadResult =
  { rows: string[][]; reason: null } | { rows: null; reason: string };

// The sheet as rows of strings, shaped like the CSV parser's output used
// to be. `rows: null` on any failure, which callers treat as "keep what
// you already have" rather than "the sheet is empty" — see the
// zero-length guards in sync-jobs and loadJobs.
export async function fetchSheetRowsViaApi(): Promise<SheetReadResult> {
  const config = federationConfig();
  if (!config) {
    const reason = 'federation env vars are not set';
    console.warn(`[sheets] ${reason}`);
    return { rows: null, reason };
  }

  const auth = authClient(config);
  if (!auth) {
    return {
      rows: null,
      reason: 'could not build the federated credential client'
    };
  }

  // No valueRenderOption: the default, FORMATTED_VALUE, returns each
  // cell as displayed, which is exactly what the CSV export gave. Asking
  // for unformatted values would hand back date serial numbers and break
  // every date in the parse.
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}` +
    `/values/${encodeURIComponent(SHEET_RANGE)}`;

  try {
    // request() attaches the token and refreshes it when stale, so the
    // STS exchange and impersonation are handled rather than
    // re-implemented here.
    const res = await auth.request<{ values?: unknown[][] }>({ url });

    if (!res.data?.values) {
      const reason = 'values.get returned no values';
      console.warn(`[sheets] ${reason}`);
      return { rows: null, reason };
    }

    // The API omits trailing empty cells, so rows arrive ragged — which
    // readCell() already handles. Coerce each cell: FORMATTED_VALUE is
    // documented to return strings, and this costs nothing if it does.
    const rows = res.data.values.map((row) =>
      row.map((cell) =>
        cell === null || cell === undefined ? '' : String(cell)
      )
    );
    return { rows, reason: null };
  } catch (err) {
    // The common failures are all configuration, and they are easy to
    // confuse with each other, so the host and status are logged rather
    // than a bare stack — otherwise the board just goes quietly stale:
    //
    //   403 from sheets.googleapis.com  the sheet is not shared with the
    //                                   service account, or the Sheets
    //                                   API is not enabled
    //   403 from iamcredentials         the pool principal lacks
    //                                   roles/iam.workloadIdentityUser
    //   400 from sts.googleapis.com     issuer, audience or attribute
    //                                   mapping does not match the token
    //   400 from sheets.googleapis.com  SHEET_RANGE names a tab that no
    //                                   longer exists
    const reason = describe(err);
    console.warn('[sheets] sheet read failed:', reason);
    return { rows: null, reason };
  }
}

// Pull the useful parts out of the thrown error without dragging its whole
// response along — that carries the request headers, and so the bearer
// token, which must not reach the logs.
function describe(err: unknown): string {
  if (typeof err !== 'object' || err === null) return String(err);
  const e = err as {
    status?: number;
    message?: string;
    response?: { status?: number; data?: unknown; config?: { url?: string } };
  };
  const status = e.response?.status ?? e.status ?? '?';
  let host = 'unknown host';
  try {
    if (e.response?.config?.url) host = new URL(e.response.config.url).host;
  } catch {
    // Leave the default.
  }
  const body =
    e.response?.data === undefined
      ? ''
      : ` ${JSON.stringify(e.response.data).slice(0, 300)}`;
  // Collapsed to one line: this string is now the body of a Slack alert
  // as well as a log line, and Google's messages run to several lines —
  // which would break the alert's sentence across the channel and split
  // the log entry into fragments that no longer grep as one.
  return `${status} from ${host}${body} (${e.message ?? 'no message'})`
    .replace(/\s+/g, ' ')
    .trim();
}
