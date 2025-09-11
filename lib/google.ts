// lib/google.ts
// Central, tolerant wrappers around Google APIs used by VSight.
// All functions accept simple primitives and return simple, predictable shapes
// so your API routes don't need to know Google’s response formats.

// ---------------------- tiny fetch helper ----------------------
async function fetchJson<T = any>(
  url: string,
  init: RequestInit & { accessToken?: string } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as any),
  };
  if (init.accessToken) headers.Authorization = `Bearer ${init.accessToken}`;
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* keep raw text */ }
  if (!res.ok) {
    const msg = (json && (json.error?.message || json.message)) || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return (json as T) ?? ({} as T);
}

// ---------------------- GA4 Admin: list properties ----------------------
/** List GA4 properties the user can see. Returns [{ name, title }] */
export async function gaListProperties(accessToken: string): Promise<{ name: string; title: string }[]> {
  const url = "https://analyticsadmin.googleapis.com/v1beta/accountSummaries";
  const data = await fetchJson<any>(url, { method: "GET", accessToken });
  const summaries = Array.isArray(data?.accountSummaries) ? data.accountSummaries : [];
  const out: { name: string; title: string }[] = [];
  for (const acc of summaries) {
    const props = Array.isArray(acc?.propertySummaries) ? acc.propertySummaries : [];
    for (const p of props) {
      out.push({ name: p?.property || "", title: p?.displayName || p?.property || "" });
    }
  }
  return out;
}

// ---------------------- GA4 Data API: runReport ----------------------
type GaRunReportRequest = {
  dateRanges: { startDate: string; endDate: string }[];
  dimensions?: { name: string }[];
  metrics?: { name: string }[];
  limit?: string | number;
};
export async function gaRunReport(
  accessToken: string,
  propertyId: string,
  body: GaRunReportRequest
): Promise<{ rows: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[] }> {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`;
  const data = await fetchJson<any>(url, {
    method: "POST",
    accessToken,
    body: JSON.stringify(body),
  });
  return { rows: Array.isArray(data?.rows) ? data.rows : [] };
}

// ---------------------- Search Console: list sites ----------------------
/** Returns { sites: { siteUrl }[] } */
export async function gscSites(accessToken: string): Promise<{ sites: { siteUrl: string }[] }> {
  const data = await fetchJson<any>("https://www.googleapis.com/webmasters/v3/sites", {
    method: "GET",
    accessToken,
  });
  const siteEntries = Array.isArray(data?.siteEntry) ? data.siteEntry : [];
  return { sites: siteEntries.map((s: any) => ({ siteUrl: String(s?.siteUrl || "") })) };
}

// ---------------------- Search Console: top queries ----------------------
type GscTopQueryOpts = {
  startDate: string;
  endDate: string;
  rowLimit?: number;
  // tolerate extra keys used by older code; ignored safely:
  dimensions?: string[];
  type?: "web" | "image" | "video" | string;
  dimensionFilterGroups?: any;
};
export async function gscTopQueries(
  accessToken: string,
  siteUrl: string,
  opts: GscTopQueryOpts
): Promise<{ rows: { query: string; clicks: number; impressions: number; ctr: number; position: number; page?: string }[] }> {
  const {
    startDate,
    endDate,
    rowLimit = 1000,
    type = "web",
    // old code may pass these; they’re ignored because Sitemaps v3 “searchanalytics/query” expects filters differently
    // but we accept them so TS doesn't fail.
  } = opts;

  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const requestBody = {
    startDate,
    endDate,
    dimensions: ["query"], // fixed to queries
    searchType: type,
    rowLimit,
  };
  const data = await fetchJson<any>(url, {
    method: "POST",
    accessToken,
    body: JSON.stringify(requestBody),
  });

  const rows = Array.isArray(data?.rows) ? data.rows : [];
  return {
    rows: rows.map((r: any) => ({
      query: String(r?.keys?.[0] ?? ""),
      clicks: Number(r?.clicks ?? 0),
      impressions: Number(r?.impressions ?? 0),
      ctr: Number(r?.ctr ?? 0),
      position: Number(r?.position ?? 0),
      page: r?.keys?.[1], // just in case caller added "page" later; harmless otherwise
    })),
  };
}

// ---------------------- GBP: list locations ----------------------
/** Minimal GBP locations. Returns { locations: [{ name, title }] } */
export async function gbpListLocations(
  accessToken: string
): Promise<{ locations: { name: string; title: string }[] }> {
  // Try the My Business Business Information API v1
  const data = await fetchJson<any>("https://mybusinessbusinessinformation.googleapis.com/v1/accounts/-/locations", {
    method: "GET",
    accessToken,
  });

  const arr = Array.isArray(data?.locations) ? data.locations : Array.isArray(data?.results) ? data.results : [];
  const locations = arr.map((l: any) => ({
    name: String(l?.name || l?.locationName || ""),
    title: String(l?.title || l?.storeCode || l?.locationName || ""),
  }));
  return { locations };
}

// ---------------------- Drive & Sheets helpers ----------------------
/** Find a spreadsheet by name in root; if missing, create it. Returns { id, name }. */
export async function driveFindOrCreateSpreadsheet(
  accessToken: string,
  name: string
): Promise<{ id: string; name: string }> {
  // Search by name
  const query = encodeURIComponent(`name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.spreadsheet' and 'root' in parents and trashed=false`);
  const search = await fetchJson<any>(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    method: "GET",
    accessToken,
  });
  const hit = Array.isArray(search?.files) && search.files[0];
  if (hit?.id) return { id: hit.id, name: hit.name };

  // Create
  const created = await fetchJson<any>("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    accessToken,
    body: JSON.stringify({ properties: { title: name } }),
  });
  return { id: String(created?.spreadsheetId || ""), name };
}

/** Read a range. Returns raw values ([][]) */
export async function sheetsGet(
  accessToken: string,
  spreadsheetId: string,
  rangeA1: string
): Promise<{ values: any[][] }> {
  const data = await fetchJson<any>(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(rangeA1)}`, {
    method: "GET",
    accessToken,
  });
  return { values: Array.isArray(data?.values) ? data.values : [] };
}

/** Append rows to a sheet tab. */
export async function sheetsAppend(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  values: any[][]
): Promise<{ updates?: any }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const data = await fetchJson<any>(url, {
    method: "POST",
    accessToken,
    body: JSON.stringify({ values }),
  });
  return { updates: data?.updates };
}

// ---------------------- Utility used by tracker (safe no-op) ----------------------
/** Best-effort: return top SERP url for a query. Stubbed to empty string in server builds. */
export async function serpTopUrl(_q: string): Promise<string> {
  // Keep as a stub to avoid runtime network surprises during build.
  return "";
}
