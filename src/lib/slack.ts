// Minimal Slack Incoming Webhook helper. Each named channel target
// gets its own env var so we can send different message types to
// different channels without leaking webhook URLs across concerns.
//
// To wire up a new channel:
//   1. Slack → your workspace app → Incoming Webhooks → Add New
//   2. Pick the target channel, copy the webhook URL
//   3. Add the URL as an env var in .env.local + Vercel
//   4. Add a getter here that reads that env var
//
// Fails safely: if the env var is missing, `postToSlackWebsite` no-ops
// and logs a warning — the calling handler still succeeds so the user
// never sees an error just because Slack isn't configured yet.

export type SlackPayload = {
  text: string;
  // Slack unfurls URLs in `text` by default. Set to `false` to skip
  // the auto-preview card.
  unfurl_links?: boolean;
};

async function postToWebhook(
  webhookUrl: string,
  payload: SlackPayload
): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Slack webhook returned ${res.status}: ${body || 'no body'}`
    );
  }
}

// Post to the #website channel. Legacy sink — kept so any external
// consumer with the old env var wired up still works. New form
// handlers should use `postToSlackForms` instead.
export async function postToSlackWebsite(
  payload: SlackPayload
): Promise<void> {
  const url = process.env.SLACK_WEBSITE_WEBHOOK_URL;
  if (!url) {
    console.warn(
      '[slack] SLACK_WEBSITE_WEBHOOK_URL not set — skipping notification'
    );
    return;
  }
  await postToWebhook(url, payload);
}

// Post to the private "forms" channel — receives every user-submitted
// form on the site: new job listings, coworking desk applications,
// podcast guest suggestions. Kept separate from #website so form
// noise stays contained and the private channel can be restricted to
// people who need to triage submissions.
export async function postToSlackForms(
  payload: SlackPayload
): Promise<void> {
  const url = process.env.SLACK_FORMS_WEBHOOK_URL;
  if (!url) {
    console.warn(
      '[slack] SLACK_FORMS_WEBHOOK_URL not set — skipping notification'
    );
    return;
  }
  await postToWebhook(url, payload);
}
