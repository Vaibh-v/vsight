// lib/google.ts
// Minimal, robust wrappers around Google APIs used by VSight.
// All functions are server-side friendly and typed loosely to avoid build breaks.

type GAProp = { name?: string; propertyType?: string; displayName?: string; _id?: string; id?: string };
type GASessionRow = { dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> };

const asJson = async (r: Response) => {
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (j && (j.error?.message || j.message)) || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return j;
};

// ---------- GA4 ----------
export async function gaListProperties(accessToken: string): Promise<Array<{ id: string; displayName: string }>> {
  // Analytics Admin list properties
  const url =
    "https://analyticsadmin.googleapis.com/v1beta/properties?filter=parent:accounts/-&pageSize=200";
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const j = await asJson(r);
  const props: GAProp[] = Array.isArray(j?.properties) ? j.properties : [];
  return props.map((p) => ({
    id: (p as any).name?.split("/").pop() || (p as any).id || "",
    displayName: p.displayName || (p as any).name || "",
  }));
}

export async function gaRunReport(
  accessToken: string,
  propertyId: string,
  body: Record<string, any>
) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return asJson(r);
}

// ---------- GSC ----------
export async function gscListSites(accessToken: string): Promise<Array<{ siteUrl: string }>> {
  const url = "https://www.googleapis.com/webmasters/v3/sites";
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const j = await asJson(r);
  const sites = Array.isArray(j?.siteEntry) ? j.siteEntry : [];
  return sites
    .filter((s: any) => s.permissionLevel && s.siteUrl)
    .map((s: any) => ({ siteUrl: s.siteUrl as string }));
}

export async function gscQuery(
  accessToken: string,
  siteUrl: string,
  payload: Record<string, any>
) {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return asJson(r);
}

export async function gscTimeseriesClicks(
  accessToken: string,
  siteUrl: string,
  start: string,
  end: string
): Promise<{ data: Array<{ date: string; clicks: number; impressions: number; ctr: number; position: number }> }> {
  const j = await gscQuery(accessToken, siteUrl, {
    startDate: start,
    endDate: end,
    dimensions: ["date"],
    rowLimit: 25000,
    type: "web",
  });
  const rows = Array.isArray(j?.rows) ? j.rows : [];
  const data = rows.map((row: any) => ({
    date: String(row?.keys?.[0] || ""),
    clicks: Number(row?.clicks || 0),
    impressions: Number(row?.impressions || 0),
    ctr: Number(row?.ctr || 0),
    position: Number(row?.position || 0),
  }));
  return { data };
}

export async function gscTopQueries(
  accessToken: string,
  siteUrl: string,
  start: string,
  end: string,
  rowLimit = 10
): Promise<Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>> {
  const j = await gscQuery(accessToken, siteUrl, {
    startDate: start,
    endDate: end,
    dimensions: ["query"],
    rowLimit,
    type: "web",
    orderBy: [{ field: "clicks", descending: true }],
  });
  const rows = Array.isArray(j?.rows) ? j.rows : [];
  return rows.map((row: any) => ({
    query: String(row?.keys?.[0] || ""),
    clicks: Number(row?.clicks || 0),
    impressions: Number(row?.impressions || 0),
    ctr: Number(row?.ctr || 0),
    position: Number(row?.position || 0),
  }));
}

// ---------- GBP (non-blocking) ----------
export async function gbpListLocations(accessToken: string): Promise<Array<{ name: string; title: string }>> {
  const ACCOUNT_ID = process.env.GBP_ACCOUNT_ID; // optional
  if (!ACCOUNT_ID) return []; // keep build & UI unblocked
  const url = `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${ACCOUNT_ID}/locations?pageSize=100`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const j = await asJson(r);
  const arr = Array.isArray(j?.locations) ? j.locations : [];
  return arr.map((l: any) => ({ name: l.name || "", title: l.title || l.storeCode || l.locationName || "" }));
}
