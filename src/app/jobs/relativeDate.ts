// "Today" / "Yesterday" / "3 days ago" for a job's listed date.
//
// Shared by the board, the location pages and the related-role lists on
// a job's own page, which were otherwise going to be a third copy.
//
// Compared in UTC on both sides: the sheet stores dates as UTC midnight,
// so comparing against a local-time "today" would roll the label over a
// day early or late for readers west or east of Greenwich.
export function formatRelativeDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const todayUTC = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  const jobUTC = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const diffDays = Math.round((todayUTC - jobUTC) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1) return `${diffDays} days ago`;
  if (diffDays === -1) return 'Tomorrow';
  return `in ${-diffDays} days`;
}
