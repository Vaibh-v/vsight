// lib/google.ts

/* ---------------------------------- Utils --------------------------------- */

type FetchOpts = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  accessToken?: string;
  body?: any;
  headers?: Record<string, string>;
};

async function fetchJson<T = any>(url: string, opts: FetchOpts = {}): Promise<T> {
  const { method = "GET", accessToken, body, headers = {} } = opts;
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };
  if (accessToken) h.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(url, {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} @ ${url} ${text ? "- " + text : ""}`.trim());
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  // @ts-ignore – allow text fallbacks
  return (await res.text()) as T;
}

const iso = (d: Date | string) =>
  typeof d === "string" ? d : new Date(d).toISOString().slice(0, 10);

/* ---------------------- Google Business Profile (GBP) ---------------------- */

/**
 * List Google Business Profile locations visible to the user.
 * Returns minimal objects: { name: string, title: string }
 *
 * We:
 * 1) list accounts via My Business Account Management
 * 2) for each account, list locations via My Business Business Information
 */
export async function gbpListLocations(accessToken: string): Promise<{ name: string; title: string }[]> {
  // 1) accounts
  const accountsUrl = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";
  const accountsData = await fetchJson<any>(accountsUrl, { accessToken });
  const accounts: string[] = Array.isArray(accountsData?.accounts)
    ? accountsData.accounts.map((a: any) => a?.name).filter(Boolean)
    : [];

  // 2) locations per account
  const all: { name: string; title: string }[] = [];
  for (const accountName of accounts) {
    // readMask keeps payload small + allowed in BI v1
    const locUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/${encodeURIComponent(
      accountName
    )}/locations?readMask=name,title`;
    const locData = await fetchJson<any>(locUrl, { accessToken });
    const locations: any[] = Array.isArray(locData?.locations) ? locData.locations : [];
    for (const l of locations) {
      all.push({ name: String(l?.name ?? ""), title: String(l?.title ?? "") });
    }
  }
  return all;
}

/* ------------------------------- Google Analytics ------------------------------ */

/** List GA4 properties (flattened) via Analytics Admin Account Summaries. */
export async function gaListProperties(accessToken: string): Promise<
  { propertyId: string; displayName: string; account: string }[]
> {
  const url = "https://analyticsadmin.googleapis.com/v1beta/accountSummaries";
  const data = await fetchJson<any>(url, { accessToken });
  const summaries: any[] = Array.isArray(data?.accountSummaries) ? data.accountSummaries : [];
  const props: { propertyId: string; displayName: string; account: string }[] = [];

  for (const acc of summaries) {
    const account = String(acc?.name ?? "");
    const propertySummaries: any[] = Array.isArray(acc?.propertySummaries) ? acc.propertySummaries : [];
    for (const p of propertySummaries) {
      props.push({
        propertyId: String(p?.property ?? "").split("/").pop() || "",
        displayName: String(p?.displayName ?? ""),
        account,
      });
    }
  }
  return props;
}

/**
 * Run GA4 report (Analytics Data API v1beta).
 * dimensions/metrics passed as string arrays; dateRanges in GA format.
 */
export async function gaRunReport(
  accessToken: string,
  propertyId: string,
  options: {
    dimensions?: string[];
    metrics?: string[];
    dateRanges?: { startDate: string; endDate: string }[];
    limit?: number;
    metricAggregations?: string[];
    dimensionFilter?: any;
  }
): Promise<any> {
  const { dimensions = [], metrics = [], dateRanges = [], limit, metricAggregations, dimensionFilter } = options;
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`;

  const body: any = {
    dimensions: dimensions.map((d) => ({ name: d })),
    metrics: metrics.map((m) => ({ name: m })),
    dateRanges,
  };
  if (typeof limit === "number") body.limit = limit;
  if (Array.isArray(metricAggregations)) body.metricAggregations = metricAggregations;
  if (dimensionFilter) body.dimensionFilter = dimensionFilter;

  return fetchJson<any>(url, { method: "POST", accessToken, body });
}

/* --------------------------- Google Search Console --------------------------- */

type GscQueryOpts = {
  startDate: string;
  endDate: string;
  type?: "web" | "image" | "video" | "news";
  rowLimit?: number;
  startRow?: number;
  dimensions?: string[]; // e.g. ["date"], ["query"], ["page"], ["query","page"], etc.
  dimensionFilterGroups?: any[];
  [key: string]: any; // tolerate extra keys from older callers
};

/**
 * Core GSC Search Analytics query.
 * Returns { rows } where rows are normalized based on requested dimensions.
 * Looser typing prevents union-mismatch TypeScript errors across varied routes.
 */
export async function gscQuery(
  accessToken: string,
  siteUrl: string,
  opts: GscQueryOpts
): Promise<{ rows: any[] }> {
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
    type,
    rowLimit,
    dimensions,
  };
  if (typeof startRow === "number") body.startRow = startRow;
  if (dimensionFilterGroups) body.dimensionFilterGroups = dimensionFilterGroups;

  const data = await fetchJson<any>(url, { method: "POST", accessToken, body });
  const rows: any[] = Array.isArray(data?.rows) ? data.rows : [];
  const has = (x: string) => dimensions.includes(x);

  const mapRow = (r: any) => {
    const clicks = Number(r?.clicks || 0);
    const impressions = Number(r?.impressions || 0);
    const ctr = Number(r?.ctr || 0);
    const position = Number(r?.position || 0);
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
    // Fallback – still return a valid shape
    return { clicks, impressions, ctr, position };
  };

  return { rows: rows.map(mapRow) };
}

/** List verified sites for the user (minimal). */
export async function gscSites(accessToken: string): Promise<{ siteUrl: string; permissionLevel?: string }[]> {
  const url = "https://www.googleapis.com/webmasters/v3/sites";
  const data = await fetchJson<any>(url, { accessToken });
  const sites: any[] = Array.isArray(data?.siteEntry) ? data.siteEntry : [];
  return sites.map((s) => ({
    siteUrl: String(s?.siteUrl || ""),
    permissionLevel: s?.permissionLevel ? String(s.permissionLevel) : undefined,
  }));
}
// Alias to satisfy older imports
export const gscListSites = gscSites;

/**
 * Convenience: top queries for a site.
 * Accepts both modern (3-arg) and legacy (5-arg) call signatures.
 */
// Overloads for ergonomics
export function gscTopQueries(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
  rowLimit?: number
): Promise<any[]>;
export function gscTopQueries(
  accessToken: string,
  siteUrl: string,
  opts: { startDate: string; endDate: string; rowLimit?: number; type?: string; dimensionFilterGroups?: any[] }
): Promise<any[]>;
export async function gscTopQueries(
  accessToken: string,
  siteUrl: string,
  a3: any,
  a4?: any,
  a5?: any
): Promise<any[]> {
  // Normalize arguments
  let startDate: string, endDate: string, rowLimit: number | undefined, type: string | undefined, dimensionFilterGroups: any[] | undefined;

  if (typeof a3 === "object" && a3) {
    startDate = a3.startDate;
    endDate = a3.endDate;
    rowLimit = a3.rowLimit;
    type = a3.type;
    dimensionFilterGroups = a3.dimensionFilterGroups;
  } else {
    startDate = String(a3);
    endDate = String(a4);
    rowLimit = typeof a5 === "number" ? a5 : undefined;
  }

  const { rows } = await gscQuery(accessToken, siteUrl, {
    startDate,
    endDate,
    rowLimit: rowLimit ?? 1000,
    type: (type as any) ?? "web",
    dimensions: ["query"],
    dimensionFilterGroups,
  });

  return rows;
}

/**
 * Convenience: daily clicks series for a site between dates.
 * Accepts both (token, siteUrl, startDate, endDate) and
 * (token, siteUrl, { startDate, endDate, rowLimit? }) signatures.
 */
export async function gscTimeseriesClicks(
  accessToken: string,
  siteUrl: string,
  rangeOrStart:
    | { startDate: string; endDate: string; rowLimit?: number }
    | string,
  maybeEnd?: string
): Promise<{ date: string; clicks: number; impressions: number; ctr: number; position: number }[]> {
  const startDate = typeof rangeOrStart === "string" ? rangeOrStart : rangeOrStart.startDate;
  const endDate = typeof rangeOrStart === "string" ? String(maybeEnd) : rangeOrStart.endDate;
  const rowLimit = typeof rangeOrStart === "string" ? undefined : rangeOrStart.rowLimit;

  const { rows } = await gscQuery(accessToken, siteUrl, {
    startDate,
    endDate,
    rowLimit,
    dimensions: ["date"],
  });

  // rows already normalized when dimensions include "date"
  return rows as any[];
}

/* ---------------------------- Drive / Sheets helpers ---------------------------- */

/**
 * Find or create a Google Spreadsheet by name in the user's Drive.
 * RETURNS an object so callers can do: `const { id: spreadsheetId } = await ...`
 */
export async function driveFindOrCreateSpreadsheet(
  accessToken: string,
  name: string
): Promise<{ id: string; name: string }> {
  // 1) Try to find
  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    `name='${name}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
  )}&fields=files(id,name)`;
  const list = await fetchJson<any>(listUrl, { accessToken });
  const found = Array.isArray(list?.files) ? list.files[0] : null;
  if (found?.id) return { id: String(found.id), name: String(found.name ?? name) };

  // 2) Create
  const createUrl = "https://sheets.googleapis.com/v4/spreadsheets";
  const created = await fetchJson<any>(createUrl, {
    method: "POST",
    accessToken,
    body: { properties: { title: name } },
  });
  return { id: String(created?.spreadsheetId || ""), name };
}

/** Append rows to a sheet/tab. `values` is a 2D array. */
export async function sheetsAppend(
  accessToken: string,
  spreadsheetId: string,
  rangeA1: string,
  values: any[][]
): Promise<any> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(rangeA1)}:append?valueInputOption=USER_ENTERED`;
  return fetchJson<any>(url, {
    method: "POST",
    accessToken,
    body: { values },
  });
}

/** Read a range from a sheet/tab. Returns Sheets `values` payload. */
export async function sheetsGet(
  accessToken: string,
  spreadsheetId: string,
  rangeA1: string
): Promise<{ values?: any[][] }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(rangeA1)}`;
  return fetchJson<any>(url, { accessToken });
}

/* ------------------------------ Misc conveniences ------------------------------ */

/**
 * Very light placeholder that returns a Google SERP URL for a query.
 * (Prevents runtime failures in tracker routes that call `serpTopUrl`.)
 */
export async function serpTopUrl(query: string): Promise<string> {
  // If you later wire a real SERP fetcher, replace this body.
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/* ------------------------------- Back-compat shim ------------------------------ */
// Some earlier code used different export names; keep shims to avoid build churn.
export const gbpListAccounts = gbpListLocations; // harmless alias
