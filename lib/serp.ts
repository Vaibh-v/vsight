export async function serpCheckBrave(apiKey: string, q: string, domain: string, count = 20) {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=${count}`;
  const r = await fetch(url, { headers: { "X-Subscription-Token": apiKey } });
  if (r.status === 429) {
    return { error: "Brave rate limit (429). Try later or reduce frequency.", ranks: [] as any[] };
  }
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    return { error: `Brave error ${r.status}: ${text || r.statusText}`, ranks: [] as any[] };
  }
  const j = await r.json();
  const results: Array<{ url: string; rank: number; title?: string }> =
    (j.web?.results || []).map((it: any, i: number) => ({ url: it.url, title: it.title, rank: i + 1 }));
  const hits = results.filter(r => r.url?.includes(domain));
  return { ranks: hits, totalScanned: results.length };
}
