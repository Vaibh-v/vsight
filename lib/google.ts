export async function gscQuery(accessToken: string, siteUrl: string, body: {
  startDate: string; endDate: string; dimensions?: string[]; rowLimit?: number; searchType?: "web"|"news"|"image"|"video";
}) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const payload = { startDate: body.startDate, endDate: body.endDate, dimensions: body.dimensions ?? ["date"], rowLimit: body.rowLimit ?? 1000, dataState: "final", searchType: body.searchType ?? "web" };
  const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error?.message || "GSC API error");
  return json;
}

export async function gscTimeseriesClicks(token: string, siteUrl: string, start: string, end: string) {
  const j = await gscQuery(token, siteUrl, { startDate: start, endDate: end, dimensions: ["date"] });
  const rows = j.rows ?? [];
  return rows.map((r: any) => ({ date: r.keys?.[0] ?? "", clicks: r.clicks ?? 0, impressions: r.impressions ?? 0, ctr: r.ctr ?? 0, position: r.position ?? 0 }));
}
