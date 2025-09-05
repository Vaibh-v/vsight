export async function postJSON(url: string, body: any) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok || j?.ok === false) throw new Error(j?.error || `${r.status} ${r.statusText}`);
  return j;
}

export function lastNDays(n: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (n - 1));
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: toISO(start), endDate: toISO(end) };
}
