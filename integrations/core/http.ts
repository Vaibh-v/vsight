export async function getJson<T>(url: string, headers: Record<string,string>): Promise<T> {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json() as Promise<T>;
}

export async function postJson<T>(url: string, headers: Record<string,string>, body: any): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json() as Promise<T>;
}
