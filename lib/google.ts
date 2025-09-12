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
 * List GBP locations. If `accountId` is provided, fetch locations for that account only.
 * Otherwise: list all accounts then aggregate all locations.
 * Returns minimal objects: { name, title }
 */
export async function gbpListLocations(
  accessToken: string,
  accountId?: string
): Promise<{ name: string; title: string }[]> {
  // Helper to fetch locations for one account
  const fetchLocationsForAccount = async (accName: string) => {
    const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${encodeURIComponent(
      accName
    )}/locations?readMask=name,title`;
    const data = await fetchJson<any>(url, { accessToken });
    const locations: any[] = Array.isArray(data?.locations) ? data.locations : [];
    return locations.map((l) => ({ name: String(l?.name ?? ""), title: String(l?.title ?? "") }));
  };

  if (accountId) {
    // Accept both plain ID ("123") and full resource ("accounts/123")
    const accResource = accountId.startsWith("accounts/") ? accountId : `accounts/${accountId}`;
    return fetchLocationsForAccount(accResource);
  }

  // No account provided: list accounts first
  const accountsUrl = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";
  const accountsData = await fetchJson<any>(accountsUrl, { accessToken });
  const accounts: string[] = Array.isArray(accountsData?.accounts)
    ? accountsData.accounts.map((a: any) => a?.name).filter(Boolean)
    : [];

  const all: { name: string; title: string }[] = [];
  for (const accName of accounts) {
    const rows = await fetchLocationsForAccount(accName);
    all.push(...rows);
  }
  return all;
}

/* ------------------------------- Google Analytics ------------------------------ */

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
 * Accepts dimensions/metrics as **string[]** OR **{name:string}[]**.
 */
export async function gaRunReport(
  accessToken: string,
  propertyId: string,
  options: {
    dimensions?: (string | { name: string })[];
    metrics?: (string | { name: string })[];
    dateRanges?: { startDate: string; endDate: string }[];
    limit?: number;
    metricAggregations?: string[];
    dimensionFilter?: any;
  }
): Promise<any> {
  const {
    dimensions = [],
    metrics = [],
    dateRanges = [],
    limit,
    metricAggregations,
    dimensionFilter,
  } = options;

  const toDim = (d: string | { name: string }) =>
    typeof d === "string" ? { name: d } : { name: String(d?.name || "") };
  const toMet = (m: string | { name: string }) =>
    typeof m === "string" ? { name: m } : { name: String(m?.name || "") };

  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`;
  const body: any = {
    dimensions: dimensions.map(toDim),
    metrics: metrics.map(toMet),
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
  dimensions?: string[];
  dimensionFilterGroups?: any[];
  [key: string]: any;
};

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
    return { clicks, impressions, ctr, position };
  };

  return { rows: rows.map(mapRow) };
}

export async function gscSites(accessToken: string): Promise<{ siteUrl: string; permissionLevel?: string }[]> {
  const url = "https://www.googleapis.com/webmasters/v3/sites";
  const data = await fetchJson<any>(url, { accessToken });
  const sites: any[] = Array.isArray(data?.siteEntry) ? data.siteEntry : [];
  return sites.map((s) => ({
    siteUrl: String(s?.siteUrl || ""),
    permissionLevel: s?.permissionLevel ? String(s.permissionLevel) : undefined,
  }));
}
export const gscListSites = gscSites;

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

  return rows as any[];
}

/* ---------------------------- Drive / Sheets helpers ---------------------------- */

export async function driveFindOrCreateSpreadsheet(
  accessToken: string,
  name: string
): Promise<{ id: string; name: string }> {
  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    `name='${name}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
  )}&fields=files(id,name)`;
  const list = await fetchJson<any>(listUrl, { accessToken });
  const found = Array.isArray(list?.files) ? list.files[0] : null;
  if (found?.id) return { id: String(found.id), name: String(found.name ?? name) };

  const createUrl = "https://sheets.googleapis.com/v4/spreadsheets";
  const created = await fetchJson<any>(createUrl, {
    method: "POST",
    accessToken,
    body: { properties: { title: name } },
  });
  return { id: String(created?.spreadsheetId || ""), name };
}

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

export async function serpTopUrl(query: string): Promise<string> {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
/* ------------------------------- Back-compat shim ------------------------------ */
// Some older code might import this; keep as alias for now (locations list, not accounts).
export const gbpListAccounts = gbpListLocations;
