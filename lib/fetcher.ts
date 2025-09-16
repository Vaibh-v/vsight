// lib/fetcher.ts
export async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const ct = res.headers.get('content-type') || '';
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  if (!ct.includes('application/json')) {
    // Most common cause: hitting a page/404 or an auth redirect
    throw new Error(`Expected JSON but got "${ct}". Body starts with: ${text.slice(0, 200)}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    throw new Error(`Invalid JSON: ${String(e)}. Body starts with: ${text.slice(0, 200)}`);
  }
}

export const toYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const safeNum = (v: unknown, digits = 1) =>
  typeof v === 'number' && Number.isFinite(v) ? Number(v.toFixed(digits)) : 0;

export function assertDateString(s: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(`${label} must be YYYY-MM-DD`);
}
