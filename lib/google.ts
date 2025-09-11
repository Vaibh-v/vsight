/* lib/google.ts
   One canonical implementation with safe alias exports.
   - No duplicate identifiers
   - Legacy names kept via `export { A as B }` aliases at the bottom
*/

type FetchOpts = {
  method?: "GET" | "POST";
  accessToken: string;
  body?: any;
  query?: Record<string, string | number | boolean | undefined>;
};

/** Small helper for authenticated Google API calls */
async function fetchJson<T = any>(url: string, opts: FetchOpts): Promise<T> {
  const { method = "GET", accessToken, body, query } = opts;
  const q = query
    ? "?" +
      Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";
  const res = await fetch(url + q, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${txt || "request failed"}`);
  }
  return (await res.json().catch(() => ({}))) as T;
}

/* ======================================
   Google Analytics 4 (Admin + Data API)
   ====================================== */

type GaRunReportOpts = {
  dimensions?: ({ name: string } | string)[];
  metrics?: ({ name: string } | string)[];
  dateRanges?: { startDate: string; endDate: string }[];
  dimensionFilter?: any;
  metricFilter?: any;
  limit?: number;
  orderBys?: any[];
};

function normalizeNames(arr?: ({ name: string } | string)[]) {
  if (!arr) return undefined;
  return arr.map((x) => (typeof x === "string" ? { name: x } : x));
}

/** List GA4 properties for the user (flattened) */
export async function gaListProperties(accessToken: string) {
  // Best coverage via account summaries => contains property summaries
  const url = "https://analyticsadmin.googleapis.com/v1beta/accountSummaries";
  const data = await fetchJson<any>(url, { method: "GET", accessToken });
  const list: { id: string; name: string }[] = [];

  const sums = Array.isArray(data?.accountSummaries) ? data.accountSummaries : [];
  for (const acc of sums) {
    const props = Array.isArray(acc?.propertySummaries) ? acc.propertySummaries : [];
    for (const p of props) {
      if (p?.property) {
        const id = String(p.property).replace("properties/", "");
        list.push({ id, name: p.displayName || id });
      }
    }
  }
  return list;
}

/** Run a GA4 report */
export async function gaRunReport(
  accessToken: string,
  propertyId: string,
  opts: GaRunReportOpts
) {
  const body = {
    dimensions: normalizeNames(opts.dimensions),
    metrics: normalizeNames(opts.metrics),
    dateRanges: opts.dateRanges,
    dimensionFilter: opts.dimensionFilter,
    metricFilter: opts.metricFilter,
    limit: opts.limit,
    orderBys: opts.orderBys,
  };
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(
    propertyId
  )}:runReport`;
  return await fetchJson<any>(url, { method: "POST", accessToken, body });
}

/* ======================================
   Google Search Console (Webmasters API)
   ====================================== */

export async function gscSites(accessToken: string) {
  const url = "https://www.googleapis.com/webmasters/v3/sites";
  const data = await fetchJson<any>(url, { method: "GET", accessToken });
  const list = Array.isArray(data?.siteEntry) ? data.siteEntry : [];
  return list.map((s: any) => ({
    siteUrl: s?.siteUrl || "",
    permissionLevel: s?.permissionLevel || "",
  }));
}

type GscQueryOpts = {
  startDate: string;
  endDate: string;
  dimensions?: string[];
  rowLimit?: number;
  startRow?: number;
  type?: "web" | "image" | "video" | string;
  dimensionFilterGroups?: any[];
};

/** Low-level Search Analytics query */
export async function gscSearchAnalyticsQuery(
  accessToken: string,
  siteUrl: string,
  opts: GscQueryOpts
) {
  const body: any = {
    startDate: opts.startDate,
    endDate: opts.endDate,
    rowLimit: opts.rowLimit,
    startRow: opts.startRow,
    type: opts.type || "web",
  };
  if (opts.dimensions?.length) body.dimensions = opts.dimensions;
  if (opts.dimensionFilterGroups) body.dimensionFilterGroups = opts.dimensionFilterGroups;

  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;
  return await fetchJson<any>(url, { method: "POST", accessToken, body });
}

/** Convenience wrapper for top queries */
export async function gscTopQueries(
  accessToken: string,
  siteUrl: string,
  opts: { startDate: string; endDate: string; rowLimit?: number; type?: string; dimensionFilterGroups?: any[] }
) {
  return await gscSearchAnalyticsQuery(accessToken, siteUrl, {
    ...opts,
    dimensions: ["query"],
  });
}

/** Convenience wrapper for date timeseries (clicks etc.) */
export async function gscTimeseries(
  accessToken: string,
  siteUrl: string,
  opts: { startDate: string; endDate: string; rowLimit?: number; type?: string }
) {
  return await gscSearchAnalyticsQuery(accessToken, siteUrl, {
    ...opts,
    dimensions: ["date"],
  });
}

/* ======================================
   Google Business Profile (GBP)
   ====================================== */

/** List GBP locations the token can see, minimal shape */
export async function gbpListLocations(accessToken: string) {
  // There are multiple surfaces; we try the Business Info API.
  // If response differs, we normalize to { name, title }[]
  // NOTE: Actual availability depends on scopes/permissions.
  const primaryUrl = "https://mybusinessbusinessinformation.googleapis.com/v1/locations";
  const data = await fetchJson<any>(primaryUrl, { method: "GET", accessToken }).catch(() => ({}));

  const raw = Array.isArray(data?.locations)
    ? data.locations
    : Array.isArray(data?.results)
    ? data.results
    : [];

  return raw.map((l: any) => ({
    name: l?.name || l?.locationName || "",
    title: l?.title || l?.locationName || l?.name || "",
  }));
}

/* ======================================
   Google Drive + Sheets (for Tracker/Vault)
   ====================================== */

/** Find a spreadsheet by title in Drive; if absent, create. Returns the spreadsheetId (string). */
export async function driveFindOrCreateSpreadsheet(
  accessToken: string,
  title: string
): Promise<string> {
  // Search in Drive
  const searchUrl = "https://www.googleapis.com/drive/v3/files";
  const q = `mimeType='application/vnd.google-apps.spreadsheet' and name='${title.replace(/'/g, "\\'")}' and trashed=false`;
  const search = await fetchJson<any>(searchUrl, {
    method: "GET",
    accessToken,
    query: { q, fields: "files(id,name)" },
  });
  const existing = Array.isArray(search?.files) ? search.files : [];
  if (existing.length > 0 && existing[0]?.id) return String(existing[0].id);

  // Create via Sheets
  const createUrl = "https://sheets.googleapis.com/v4/spreadsheets";
  const created = await fetchJson<any>(createUrl, {
    method: "POST",
    accessToken,
    body: { properties: { title } },
  });
  const spreadsheetId = created?.spreadsheetId || created?.id;
  if (!spreadsheetId) throw new Error("Failed to create spreadsheet");
  return String(spreadsheetId);
}

/** Read a range from a spreadsheet */
export async function sheetsGet(
  accessToken: string,
  spreadsheetId: string,
  range: string
) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(range)}`;
  return await fetchJson<any>(url, { method: "GET", accessToken });
}

/** Append rows to a sheet (range is just the sheet/tab name) */
export async function sheetsAppend(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  values: any[][]
) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(sheetName)}:append`;
  return await fetchJson<any>(url, {
    method: "POST",
    accessToken,
    query: { valueInputOption: "RAW", insertDataOption: "INSERT_ROWS" },
    body: { values },
  });
}

/* ======================================
   Misc helpers used around the app
   ====================================== */

/** Optional SERP snapshot helper; safe fallback returns empty string */
export async function serpTopUrl(_query: string): Promise<string> {
  // Intentionally returns "" to avoid external dependency/rate limits in build.
  // You can wire this to a real SERP API later.
  return "";
}

/* ======================================
   Compatibility alias exports (NO duplicates)
   ====================================== */
// GA: no legacy aliases needed beyond function names above

// GSC legacy names used around the repo:
export { gscSearchAnalyticsQuery as gscQuery };
export { gscSites as gscListSites };
export { gscTimeseries as gscTimeseriesClicks };

// GBP: the repo imports gbpListLocations directly (already exported)

// Drive/Sheets: names already match what routes import

// Helper export (some files import it)
export { fetchJson };
