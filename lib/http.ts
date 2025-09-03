export async function getJSON<T = any>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      const j = await r.json();
      msg = j.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return r.json();
}

export async function postJSON<T = any>(url: string, body: any): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      const j = await r.json();
      msg = j.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return r.json();
}

export const iso = (d: Date) => d.toISOString().slice(0, 10);
export function lastNDays(n: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (n - 1));
  return { startDate: iso(start), endDate: iso(end) };
}
