/* lib/google.ts
 * Unified Google helpers for VSight (GA4, GSC, GBP, Drive/Sheets)
 * All functions below are **server-side** only (used by API routes).
 */

type FetchJsonOpts = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  accessToken?: string;
  body?: any;
  headers?: Record<string, string>;
  // Optional query params if you prefer providing them separately
  query?: Record<string, string | number | boolean | undefined>;
};

/** Minimal fetch wrapper that throws on non-2xx and returns parsed JSON (or null). */
export async function fetchJson(url: string, opts: FetchJsonOpts = {}) {
  const { method = "GET", accessToken, body, headers = {}, query } = opts;

  const qs =
    query &&
    Object.entries(query)
      .filter(([_, v]) => v !== undefined && v !== null && v !== "")
      .map(
        ([k, v]) =>
          `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
      )
      .join("&");

  const fullUrl = qs ? `${url}${url.includes("?") ? "&" : "?"}${qs}` : url;

  const res = await fetch(fullUrl, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    // Next.js runtime is fine with node-fetch/polyfill
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status} ${res.statusText} for ${fullUrl}\n${text}`
    );
  }

  // Some Google endpoints legitimately return empty bodies on 204, etc.
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;

  return (await res.json()) as any;
}

/* -------------------------------------------------------------------------------------------------
 * GA4 (Analytics Data API & Admin API)
 * ------------------------------------------------------------------------------------------------- */

export type GaRunReportRequest =
  | {
      // caller may pass plain strings:
      dimensions?: string[];
      metrics?: string[];
      dateRanges: { startDate: string; endDate: string }[];
      [k: string]: any;
    }
  | {
      // or the official shape:
      dimensions?: Array<{ name: string }>;
      metrics?: Array<{ name: string }>;
      dateRanges: { startDate: string; endDate: string }[];
      [k: string]: any;
    };

/** Normalizes dimension/metric inputs (strings or {name}) to the API's {name}[] form. */
function normalizeGaFields(list?: string[] | Array<{ name: string }>) {
  if (!list) return undefined;
  return list.map((d: any) =>
    typeof d === "string" ? { name: d } : { name: String(d?.name || "") }
  );
}

/** GA4 Admin: list all properties visible to the user. */
export async function gaListProperties(
  accessToken: string
): Promise<Array<{ id: string; name: string }>> {
  // Admin API account summaries include property summaries.
  const url =
    "https://analyticsadmin.googleapis.com/v1beta/accountSummaries";
  const data = await fetchJson(url, { accessToken });

  const summaries: any[] = Array.isArray(data?.accountSummaries)
    ? data.accountSummaries
    : [];

  const rows: Array<{ id: string; name: string }> = [];
  for (const s of summaries) {
    const ps: any[] = Array.isArray(s?.propertySummaries)
      ? s.propertySummaries
      : [];
    for (const p of ps) {
      const id = String(p?.property || "").replace(/^properties\//, "");
      const name = String(p?.displayName || id);
      rows.push({ id, name });
    }
  }
  return rows;
}

/** GA4 Data: runReport wrapper. Accepts string[] or {name}[] for dims/metrics. */
export async function gaRunReport(
  accessToken: string,
  propertyId: string,
  request: GaRunReportRequest
) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(
    propertyId
  )}:runReport`;

  const body = {
    ...request,
    // normalize accepted input shapes to official API shape
    dimensions: normalizeGaFields(
      (request as any).dimensions
    ),
    metrics: normalizeGaFields((request as any).metrics),
  };

  return await fetchJson(url, { method: "POST", accessToken, body });
}

/* -------------------------------------------------------------------------------------------------
 * Google Search Console (Search Analytics)
 * ------------------------------------------------------------------------------------------------- */

export type GscQueryOpts = {
  startDate: string;
  endDate: string;
  // Official body supports these; leave optional for flexibility.
  dimensions?: string[];
  rowLimit?: number;
  type?: string; // "web" | "image" | "video" | etc.
  dimensionFilterGroups?: any[];
};

export type GscRow =
  | { date: string; clicks: number; impressions: number; ctr: number; position: number }
  | { query: string; clicks: number; impressions: number; ctr: number; position: number; page?: string }
  | { page: string; clicks: number; impressions: number; ctr: number; position: number; query?: string };

/** List verified sites for the user. */
export async function gscSites(
  accessToken: string
): Promise<Array<{ siteUrl: string }>> {
  const url = "https://searchconsole.googleapis.com/webmasters/v3/sites";
  const data = await fetchJson(url, { accessToken });
  const siteEntry: any[] = Array.isArray(data?.siteEntry) ? data.siteEntry : [];
  return siteEntry
    .filter((s) => s?.permissionLevel && s?.siteUrl)
    .map((s) => ({ siteUrl: String(s.siteUrl) }));
}

/** Raw Search Analytics query wrapper. Returns `{ rows: GscRow[] }`. */
export async function gscQuery(
  accessToken: string,
  siteUrl: string,
  opts: GscQueryOpts
): Promise<{ rows: GscRow[] }> {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;

  // Call API
  const resp = await fetchJson(url, {
    method: "POST",
    accessToken,
    body: {
      startDate: opts.startDate,
      endDate: opts.endDate,
      dimensions: opts.dimensions, // official body accepts this
      rowLimit: opts.rowLimit,
      type: opts.type || "web",
      dimensionFilterGroups: opts.dimensionFilterGroups,
    },
  });

  const rows: any[] = Array.isArray(resp?.rows) ? resp.rows : [];

  // Convert webmasters rows to a consistent union shape
  const mapRow = (r: any): GscRow => {
    const clicks = Number(r?.clicks || 0);
    const impressions = Number(r?.impressions || 0);
    const ctr = Number(r?.ctr || 0);
    const position = Number(r?.position || 0);
    const keys: string[] = Array.isArray(r?.keys) ? r.keys : [];

    const dims = opts.dimensions || [];
    if (dims.includes("date")) {
      const date = String(keys[0] || "");
      return { date, clicks, impressions, ctr, position };
    }
    if (dims.includes("page") && dims.includes("query")) {
      const page = String(keys[0] || "");
      const query = String(keys[1] || "");
      return { page, query, clicks, impressions, ctr, position };
    }
    if (dims.includes("page")) {
      const page = String(keys[0] || "");
      return { page, clicks, impressions, ctr, position };
    }
    // default to "query"
    const query = String(keys[0] || "");
    return { query, clicks, impressions, ctr, position };
  };

  return { rows: rows.map(mapRow) };
}

/** Convenience: Top queries for a date range. */
export async function gscTopQueries(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
  limit = 10
): Promise<Array<Extract<GscRow, { query: string }>>> {
  const { rows } = await gscQuery(accessToken, siteUrl, {
    startDate,
    endDate,
    dimensions: ["query"],
    rowLimit: limit,
    type: "web",
  });
  // rows are already normalized to { query, clicks, ... }
  return rows.filter((r: any) => "query" in r) as any[];
}

/** Convenience: Daily time series (clicks etc.) for a date range. */
export async function gscTimeseriesClicks(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<Array<Extract<GscRow, { date: string }>>> {
  const { rows } = await gscQuery(accessToken, siteUrl, {
    startDate,
    endDate,
    dimensions: ["date"],
    type: "web",
  });
  return rows.filter((r: any) => "date" in r) as any[];
}

/* -------------------------------------------------------------------------------------------------
 * Google Business Profile (GBP)
 * ------------------------------------------------------------------------------------------------- */

/** List GBP accounts visible to the user. */
export async function gbpListAccounts(
  accessToken: string
): Promise<Array<{ id: string; name: string }>> {
  const url = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";
  const data = await fetchJson(url, { accessToken });
  const accounts: any[] = Array.isArray(data?.accounts) ? data.accounts : [];
  return accounts.map((a) => ({
    id: String(a?.name || "").replace(/^accounts\//, ""),
    name: String(a?.accountName || a?.name || ""),
  }));
}

/** List GBP locations for an account. If accountId is omitted, tries the first account. */
export async function gbpListLocations(
  accessToken: string,
  accountId?: string
): Promise<
  Array<{
    name: string; // "locations/XXXX" or "accounts/{acc}/locations/{loc}"
    title: string;
    primaryCategory?: string;
  }>
> {
  let accName = accountId ? `accounts/${accountId}` : "";
  if (!accName) {
    const accs = await gbpListAccounts(accessToken);
    if (!accs.length) return [];
    accName = `accounts/${accs[0].id}`;
  }

  // Business Information API
  const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${accName}/locations`;
  const data = await fetchJson(url, {
    accessToken,
    query: {
      readMask:
        "name,title,primaryCategory",
      pageSize: 100,
    },
  });

  const locations: any[] = Array.isArray(data?.locations) ? data.locations : [];
  return locations.map((l) => ({
    name: String(l?.name || ""),
    title: String(l?.title || ""),
    primaryCategory: String(l?.primaryCategory?.displayName || ""),
  }));
}

/* -------------------------------------------------------------------------------------------------
 * Drive + Sheets helpers
 * ------------------------------------------------------------------------------------------------- */

/** Find a spreadsheet by name; if missing, create it. Returns { id, name }. */
export async function driveFindOrCreateSpreadsheet(
  accessToken: string,
  name: string
): Promise<{ id: string; name: string }> {
  // Try Drive search (files.list)
  const search = await fetchJson("https://www.googleapis.com/drive/v3/files", {
    accessToken,
    query: {
      q:
        `name='${name.replace(/'/g, "\\'")}' and ` +
        `mimeType='application/vnd.google-apps.spreadsheet' and ` +
        `'me' in owners`,
      pageSize: 1,
      fields: "files(id,name)",
      spaces: "drive",
    },
  });

  const found = Array.isArray(search?.files) ? search.files[0] : null;
  if (found?.id) {
    return { id: String(found.id), name: String(found.name || name) };
  }

  // Create via Sheets API
  const created = await fetchJson(
    "https://sheets.googleapis.com/v4/spreadsheets",
    {
      method: "POST",
      accessToken,
      body: { properties: { title: name } },
    }
  );

  return { id: String(created?.spreadsheetId || ""), name };
}

/** Append rows to a sheet (values is a 2D array). */
export async function sheetsAppend(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  values: any[][]
) {
  const range = `${sheetName}!A1`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(range)}:append`;

  return await fetchJson(url, {
    method: "POST",
    accessToken,
    query: { valueInputOption: "USER_ENTERED", insertDataOption: "INSERT_ROWS" },
    body: { values },
  });
}

/** Read a range from a sheet. */
export async function sheetsGet(
  accessToken: string,
  spreadsheetId: string,
  a1Range: string
): Promise<{ values?: any[][] }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(a1Range)}`;
  return await fetchJson(url, { accessToken });
}

/* -------------------------------------------------------------------------------------------------
 * Misc
 * ------------------------------------------------------------------------------------------------- */

/** Best-effort SERP helper – placeholder (returns empty string in this build). */
export async function serpTopUrl(_query: string): Promise<string> {
  // Intentionally left as a stub to avoid external scraping during builds.
  return "";
}
