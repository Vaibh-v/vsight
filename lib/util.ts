// lib/util.ts

/** Return YYYY-MM-DD for a Date */
export function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Convenience: last N days inclusive ending today.
 * Returns both shapes used around the app:
 *   - { start, end }   (AppState)
 *   - { startDate, endDate } (older helpers)
 */
export function lastNDays(n: number): {
  start: string; end: string; startDate: string; endDate: string;
} {
  const today = new Date();
  const startDateObj = new Date(Date.now() - (n - 1) * 24 * 60 * 60 * 1000);
  const startDate = iso(startDateObj);
  const endDate = iso(today);
  return { start: startDate, end: endDate, startDate, endDate };
}

/**
 * Simple CSV generator.
 * - columns is the ordered list of keys to include
 * - values are quoted if they contain a quote, comma, or newline
 */
export function toCSV(rows: any[], columns: string[]): string {
  const esc = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.join(",");
  const body = rows.map((r) => columns.map((c) => esc(r[c])).join(",")).join("\n");
  return `${header}\n${body}`;
}

/** Merge GA (sessions) & GSC (clicks/ctr) series by date (optional helper) */
export function mergeDaily(
  ga: Array<{ date: string; sessions: number }>,
  gsc: Array<{ date: string; clicks: number; ctr: number }>
) {
  const map = new Map<string, any>();
  for (const r of ga || []) map.set(r.date, { date: r.date, sessions: r.sessions ?? 0 });
  for (const r of gsc || []) {
    const row = map.get(r.date) || { date: r.date };
    row.clicks = r.clicks ?? 0;
    row.ctr = typeof r.ctr === "number" ? Number((r.ctr * 100).toFixed(2)) : 0;
    map.set(r.date, row);
  }
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
}
