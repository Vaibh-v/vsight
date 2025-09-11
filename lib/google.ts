// lib/google.ts
// Centralized Google API helpers used by API routes.
// All exports here are unique (no duplicate names) and strictly typed.

type Json = any;

// --- low-level fetch ---
async function fetchJson(
  url: string,
  opts: { method: string; accessToken: string; body?: any }
): Promise<Json> {
  const { method, accessToken, body } = opts;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${t || url}`);
  }
  return res.json();
}

// =======================================
// GA4
// =======================================

/** List GA4 properties for the user (flattened). */
export async function gaListProperties(
  accessToken: string
): Promise<Array<{ id: string; displayName: string }>> {
  // Best coverage via Analytics Admin "accountSummaries"
  // https://analyticsadmin.googleapis.com/v1beta/accountSummaries
  const url =
    "https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200";
  const data = await fetchJson(url, { method: "GET", accessToken });

  const out: Array<{ id: string; displayName: string }> = [];
  const summaries = Array.isArray(data?.accountSummaries)
    ? data.accountSummaries
    : [];

  for (const acc of summaries) {
    const props = Array.isArray(acc?.propertySummaries)
      ? acc.propertySummaries
      : [];
    for (const p of props) {
      // property "property" field is in the form "properties/123456789"
      const pid = String(p?.property || "").split("/").pop() || "";
      if (pid) out.push({ id: pid, displayName: String(p?.displayName || "") });
    }
  }
  return out;
}

/** Run GA4 report on a property */
export async function gaRunReport(
  accessToken: string,
  propertyId: string,
  body: {
    dimensions?: Array<{ name: string }>;
    metrics?: Array<{ name: string }>;
    dateRanges: Array<{ startDate: string; endDate: string }>;
  }
): Promise<{
  rows?: Array<{
    dimensionValues?: Array<{ value?: string }>;
    metricValues?: Array<{ value?: string }>;
  }>;
}> {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
  return fetchJson(url, { method: "POST", accessToken, body });
}

// =======================================
// Google Search Console (Webmasters)
// =======================================

/** List verified GSC site entries */
export async function gscListSites(
  accessToken: string
): Promise<Array<{ siteUrl: string; permissionLevel?: string }>> {
  // https://developers.google.com/webmaster-tools/search-console-api-original/v3/sites/list
  const url = "https://www.googleapis.com/webmasters/v3/sites";
  const data = await fetchJson(url, { method: "GET", accessToken });

  const sites = Array.isArray(data?.siteEntry) ? data.siteEntry : [];
  return sites.map((s: any) => ({
    siteUrl: String(s?.siteUrl || ""),
    permissionLevel: String(s?.permissionLevel || ""),
  }));
}

/** Generic GSC query wrapper (flexible) */
export async function gscQuery(
  accessToken: string,
  siteUrl: string,
  body: {
    startDate: string;
    endDate: string;
    dimensions?: string[];
    rowLimit?: number;
    type?: "web" | "image" | "video" | string;
    dimensionFilterGroups?: any[];
    startRow?: number;
  }
): Promise<{
  rows?: Array<{
    keys?: string[];
    clicks?: number;
    impressions?: number;
    ctr?: number;
    position?: number;
  }>;
}> {
  const enc = encodeURIComponent(siteUrl);
  const url = `https://www.googleapis.com/webmasters/v3/sites/${enc}/searchAnalytics/query`;
  return fetchJson(url, { method: "POST", accessToken, body });
}

/** Convenience: Top queries in a date range */
export async function gscTopQueries(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
  rowLimit = 1000
): Promise<
  Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>
> {
  const rep = await gscQuery(accessToken, siteUrl, {
    startDate,
    endDate,
    dimensions: ["query"],
    rowLimit,
    type: "web",
  });

  const rows = Array.isArray(rep?.rows) ? rep.rows : [];
  return rows.map((r) => ({
    query: String(r?.keys?.[0] || ""),
    clicks: Number(r?.clicks || 0),
    impressions: Number(r?.impressions || 0),
    ctr: Number(r?.ctr || 0),
    position: Number(r?.position || 0),
  }));
}

/** Convenience: timeseries by date with clicks/impressions/ctr/position */
export async function gscTimeseriesClicks(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<Array<{ date: string; clicks: number; impressions: number; ctr: number; position: number }>> {
  const rep = await gscQuery(accessToken, siteUrl, {
    startDate,
    endDate,
    dimensions: ["date"],
    rowLimit: 5000,
    type: "web",
  });

  const rows = Array.isArray(rep?.rows) ? rep.rows : [];
  return rows.map((r) => ({
    date: String(r?.keys?.[0] || ""),
    clicks: Number(r?.clicks || 0),
    impressions: Number(r?.impressions || 0),
    ctr: Number(r?.ctr || 0),
    position: Number(r?.position || 0),
  }));
}

// =======================================
// Google Business Profile (GBP)
// =======================================

/**
 * List GBP locations the user can access.
 * Requires scope: https://www.googleapis.com/auth/business.manage
 * API: My Business Business Information
 * https://mybusinessbusinessinformation.googleapis.com/v1/locations?readMask=name,title
 */
export async function gbpListLocations(
  accessToken: string
): Promise<{ locations: Array<{ name: string; title: string }> }> {
  const url =
    "https://mybusinessbusinessinformation.googleapis.com/v1/locations?readMask=name,title&pageSize=100";
  const data = await fetchJson(url, { method: "GET", accessToken });

  const list = Array.isArray(data?.locations) ? data.locations : [];
  const locations = list.map((l: any) => ({
    name: String(l?.name || ""),
    title: String(l?.title || ""),
  }));

  return { locations };
}
