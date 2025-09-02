export const iso = (d: Date) => d.toISOString().slice(0, 10);

export function lastNDays(n: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (n - 1));
  return { startDate: iso(start), endDate: iso(end) };
}

export function toCSV(rows: any[], headers: string[]) {
  // Use regex replace instead of replaceAll to keep ES2020-compatible typings
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc((r as any)[h])).join(",")),
  ].join("\n");
}
