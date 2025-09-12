// lib/google.ts
// One-stop Google helper module used by GA4, GSC, GBP and Drive/Sheets routes.
// All functions are defensive and accept both positional + options-style calls
// to avoid "Expected N args" TypeScript build errors seen in logs.

// -------------------------------
// Utilities
// -------------------------------
type FetchOpts = {
  method?: "GET" | "POST";
  accessToken?: string;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, string | number | boolean | undefined | null>;
};

async function fetchJson(url: string, opts: FetchOpts = {}) {
  const { method = "GET", accessToken, headers = {}, body, query } = opts;
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };
  if (accessToken) h.Authorization = `Bearer ${accessToken}`;

  let finalUrl = url;
  if (query && Object.keys(query).length) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) q.append(k, String(v));
    }
    finalUrl += (finalUrl.includes("?") ? "&" : "?") + q.toString();
  }

  const res = await fetch(finalUrl, {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text || finalUrl}`);
  }
  if (res.status === 204) return {};
  return res.json();
}

// ISO helper
const iso = (d: string | Date) =>
  typeof d === "string" ? d : new Date(d).toISOString().slice(0, 10);

// -------------------------------
// Google Analytics 4 (GA4)
// -------------------------------

/** List GA4 properties for the authenticated user (flattened). */
export async function gaListProperties(accessToken: string) {
  // Best coverage via account summaries API.
  const url = "https://analyticsadmin.googleapis.com/v1beta/accountSummaries";
  const data = await fetchJson(url, { method: "GET", accessToken });
  const summaries: any[] = Array.isArray(data?.accountSummaries)
    ? data.accountSummaries
    : [];

  const out: { propertyId: string; propertyName: string; account: string }[] =
    [];

  for (const s of summaries) {
    const props: any[] = Array.isArray(s?.propertySummaries)
      ? s.propertySummaries
      : [];
    for (const p of props) {
      // property name format: "properties/123456789"
      const id = String(p?.property || "").split("/").pop() || "";
      out.push({
        propertyId: id,
        propertyName: String(p?.displayName || id),
        account: String(s?.name || ""),
      });
    }
  }
  return out;
}

/**
 * GA4 run report.
 * Accepts dimensions/metrics as string[] or {name}[] and normalizes to API shape.
 */
export async function gaRunReport(
  accessToken: string,
  propertyId: string,
  req: {
    dimensions?: Array<{ name: string } | string>;
    metrics?: Array<{ name: string } | string>;
    dateRanges?: Array<{ startDate: string; endDate: string }>;
    limit?: number;
    [key: string]: any; // tolerate extras
  }
) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const normList = (arr?: Array<{ name: string } | string>) =>
    (arr || []).map((x) => (typeof x === "string" ? { name: x } : x));

  const body = {
    ...req,
    dimensions: normList(req.dimensions),
    metrics: normList(req.metrics),
  };

  const data = await fetchJson(url, {
    method: "POST",
    accessToken,
    body,
  });

  // Return raw; callers usually map themselves
  return data;
}

// -------------------------------
// Google Search Console (GSC)
// -------------------------------

type GscQueryOpts = {
  startDate: string;
  endDate: string;
  type?: string; // "web" (default), "image", "video", "news"
  rowLimit?: number;
  startRow?: number;
  dimensions?: string[]; // e.g., ["date"], ["query"], ["page"], etc.
  dimensionFilterGroups?: any[];
  [key: string]: any; // tolerate extra keys from older callers
};

/**
 * GSC query (Search Analytics: query searchanalytics.query)
 * Returns normalized rows depending on dimensions.
 */
export async function gscQuery(
  accessToken: string,
  siteUrl: string,
  opts: GscQueryOpts
): Promise<{
  rows: Array<
    | { date: string; clicks: number; impressions: number; ctr: number; position: number }
    | { query: string; clicks: number; impressions: number; ctr: number; position: number; page?: string }
    | { page: string; clicks: number; impressions: number; ctr: number; position: number; query?: string }
  >;
}> {
  const {
    startDate,
    endDate,
    type = "web",
    rowLimit = 1000,
    startRow,
    dimensions = [],
    dimensionFilterGroups,
  } = opts;

  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;

  const body: any = {
    startDate: iso(startDate),
    endDate: iso(endDate),
    dimensions,
    rowLimit,
    type,
  };
  if (typeof startRow === "number") body.startRow = startRow;
  if (dimensionFilterGroups) body.dimensionFilterGroups = dimensionFilterGroups;

  const data = await fetchJson(url, {
    method: "POST",
    accessToken,
    body,
  });

  const rows: any[] = Array.isArray(data?.rows) ? data.rows : [];

  const has = (x: string) => dimensions.includes(x);

  const mapRow = (r: any) => {
    const clicks = Number(r?.clicks || 0);
    const impressions = Number(r?.impressions || 0);
    const ctr = Number(r?.ctr || 0);
    const position = Number(r?.position || 0);

    // keys order matches dimensions order
    const keys: string[] = Array.isArray(r?.keys) ? r.keys.map(String) : [];

    if (has("date")) {
      const date = String(keys[dimensions.indexOf("date")] || "");
      return { date, clicks, impressions, ctr, position };
    }

    if (has("query") && has("page")) {
      const query = String(keys[dimensions.indexOf("query")] || "");
      const page = String(keys[dimensions.indexOf("page")] || "");
      return { query, page, clicks, impressions, ctr, position };
    }

    if (has("query")) {
      const query = String(keys[dimensions.indexOf("query")] || "");
      return { query, clicks, impressions, ctr, position };
    }

    if (has("page")) {
      const page = String(keys[dimensions.indexOf("page")] || "");
      return { page, clicks, impressions, ctr, position };
    }

    // fallback
    return { clicks, impressions, ctr, position };
  };

  return { rows: rows.map(mapRow) };
}

/**
 * Flexible Top Queries helper.
 * Accepts both:
 *   - (token, site, { startDate, endDate, rowLimit, ... })
 *   - (token, site, startDate, endDate, rowLimit?)
 */
export async function gscTopQueries(
  accessToken: string,
  siteUrl: string,
  a: any | string,
  b?: string,
  c?: number
) {
  const opts: GscQueryOpts =
    typeof a === "string"
      ? { startDate: a, endDate: String(b || a), rowLimit: c }
      : a || {};

  const { startDate, endDate, rowLimit, type, dimensionFilterGroups } = opts;

  const { rows } = await gscQuery(accessToken, siteUrl, {
    startDate,
    endDate,
    rowLimit,
    type,
    dimensionFilterGroups,
    dimensions: ["query"],
  });

  return rows;
}

/**
 * Flexible date timeseries (by date) for clicks/impressions/ctr/position.
 * Accepts both positional and object style.
 */
export async function gscTimeseriesClicks(
  accessToken: string,
  siteUrl: string,
  a: { startDate: string; endDate: string; rowLimit?: number; type?: string } | string,
  b?: string,
  c?: number
) {
  const opts =
    typeof a === "string"
      ? { startDate: a, endDate: String(b || a), rowLimit: c }
      : a || {};

  const { startDate, endDate, rowLimit, type } = opts;

  const { rows } = await gscQuery(accessToken, siteUrl, {
    startDate,
    endDate,
    rowLimit,
    type,
    dimensions: ["date"],
  });

  return rows.map((r: any) => ({
    date: String((r as any)?.date || ""),
    clicks: Number((r as any)?.clicks || 0),
    impressions: Number((r as any)?.impressions || 0),
    ctr: Number((r as any)?.ctr || 0),
    position: Number((r as any)?.position || 0),
  }));
}

/** List verified sites (GSC). */
export async function gscSites(accessToken: string) {
  const url = "https://www.googleapis.com/webmasters/v3/sites";
  const data = await fetchJson(url, { method: "GET", accessToken });
  const siteEntries: any[] = Array.isArray(data?.siteEntry) ? data.siteEntry : [];
  return siteEntries
    .filter((s) => String(s?.permissionLevel || "").toLowerCase() !== "siteunverifieduser")
    .map((s) => ({ siteUrl: String(s?.siteUrl || ""), permissionLevel: String(s?.permissionLevel || "") }));
}
// Legacy alias to satisfy routes that import { gscListSites }
export const gscListSites = gscSites;

// -------------------------------
// Google Business Profile (GBP)
// -------------------------------

/** List GBP locations for the user (flattened) */
export async function gbpListLocations(accessToken: string) {
  // 1) fetch accounts
  const accountsUrl = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";
  const acctData = await fetchJson(accountsUrl, { accessToken });
  const accounts: any[] = Array.isArray(acctData?.accounts) ? acctData.accounts : [];
  const accountNames = accounts.map((a) => String(a?.name || "")).filter(Boolean);

  const out: { name: string; title: string }[] = [];

  // 2) list locations for each account
  for (const accountName of accountNames) {
    const locUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`;
    // Pull a reasonable page size; follow nextPageToken if present
    let pageToken: string | undefined = undefined;
    do {
      const locData = await fetchJson(locUrl, {
        accessToken,
        query: { pageSize: 100, pageToken },
      });
      const locs: any[] = Array.isArray(locData?.locations)
        ? locData.locations
        : Array.isArray(locData?.results)
        ? locData.results
        : [];

      for (const l of locs) {
        const name = String(l?.name || l?.locationName || "");
        const title =
          String(l?.title || l?.locationName || l?.storeCode || l?.metadata?.placeId || name);
        if (name) out.push({ name, title });
      }
      pageToken = String(locData?.nextPageToken || "") || undefined;
    } while (pageToken);
  }

  return out;
}

// -------------------------------
// Google Drive / Sheets (for tracker, settings, KV)
// -------------------------------

/**
 * Find or create a spreadsheet named `desiredName` in user's Drive root.
 * Returns { id, name }.
 * Backwards-compatible convenience: some old code expected a string id.
 * Use the returned object; if you need just the id, destructure or use the helper below.
 */
export async function driveFindOrCreateSpreadsheet(
  accessToken: string,
  desiredName: string
): Promise<{ id: string; name: string }> {
  // Try to find
  const searchUrl = "https://www.googleapis.com/drive/v3/files";
  const q = `name='${desiredName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
  const found = await fetchJson(searchUrl, {
    accessToken,
    query: { q, fields: "files(id,name)" },
  });

  const files: any[] = Array.isArray(found?.files) ? found.files : [];
  if (files.length > 0) {
    const f = files[0];
    return { id: String(f?.id || ""), name: String(f?.name || desiredName) };
  }

  // Create
  const createUrl = "https://sheets.googleapis.com/v4/spreadsheets";
  const created = await fetchJson(createUrl, {
    method: "POST",
    accessToken,
    body: { properties: { title: desiredName } },
  });

  const id = String(created?.spreadsheetId || "");
  const name = String(created?.properties?.title || desiredName);
  return { id, name };
}

/** Convenience: return only spreadsheetId (string). */
export async function driveFindOrCreateSpreadsheetId(
  accessToken: string,
  desiredName: string
): Promise<string> {
  const { id } = await driveFindOrCreateSpreadsheet(accessToken, desiredName);
  return id;
}

/** Sheets: get values for a range. Returns { values?: any[][] } */
export async function sheetsGet(
  accessToken: string,
  spreadsheetId: string,
  range: string
): Promise<{ values?: any[][] }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}`;
  return fetchJson(url, { accessToken });
}

/** Sheets: append rows (values: any[][]) to a given sheet (range like "Tracker" or "Tracker!A:J"). */
export async function sheetsAppend(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}:append`;
  return fetchJson(url, {
    method: "POST",
    accessToken,
    query: { valueInputOption: "RAW", insertDataOption: "INSERT_ROWS" },
    body: { values },
  });
}

// -------------------------------
// (Optional) SERP helper used in tracker/run.ts — safe fallback
// -------------------------------
/**
 * Returns a top URL for a query. If SERP_API_KEY is not configured, returns "".
 * You can wire to your preferred provider later; this keeps build happy.
 */
export async function serpTopUrl(query: string): Promise<string> {
  const key = process.env.SERP_API_KEY;
  if (!key) return "";
  try {
    // Example placeholder (won’t be called in build-time; runtime only)
    const data = await fetchJson("https://serpapi.example.com/search", {
      query: { q: query, api_key: key, num: 1 },
    });
    const url = data?.results?.[0]?.url || "";
    return String(url || "");
  } catch {
    return "";
  }
}

// -------------------------------
// Exports compatibility map (avoid “no exported member” errors)
// -------------------------------
export const gbpList = gbpListLocations; // if any legacy import referenced gbpList
