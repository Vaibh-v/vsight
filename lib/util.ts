// lib/util.ts
export function iso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function lastNDays(n: number) {
  const end = iso(new Date());
  const start = iso(new Date(Date.now() - (n - 1) * 24 * 60 * 60 * 1000));
  // Return both shapes for compatibility across files
  return {
    start, end,              // ← new shape (DateRange)
    startDate: start,        // ← legacy shape
    endDate: end,
  };
}
