// lib/google.ts
// Unified Google helpers (GA4, GSC, GBP, Drive, Sheets) + compatibility aliases.
// All functions are exported exactly once to avoid "cannot redeclare" errors.

type FetchOpts = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  accessToken: string;
  body?: any;
  headers?: Record<string, string>;
};

async function fetchJson<T = any>(url: string, opts: FetchOpts): Promise<T> {
  const { method = "GET", accessToken, body, headers = {} } = opts;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} at ${url}: ${text}`);
  }
  return (await res.json()) as T;
}

/* ============================================================
   GA4
   ============================================================ */

/** List GA4 properties for the user (flattened to id/displayName). */
export async function gaListProperties(accessToken: string) {
  // Best coverage via accountSummaries; they include property summaries
  const url = "https://analyticsadmin.googleapis.com/v1beta/accountSummaries";
  const data = await fetchJson<any>(url, { method: "GET", accessToken });

  const summaries = data?.accountSummaries ?? [];
  const props: Array<{ id: string; displayName: string }> = [];
  for (const s of summaries) {
    const ps = s?.propertySummaries ?? [];
    for (const p of ps) {
      props.push({ id: String(p?.property ?? "").replace("properties/", ""), displayName: String(p?.displayName ?? "") });
    }
  }
  // fallback: properties.list (in case accountSummaries is empty)
  if (!props.length) {
    const url2 = "https://analyticsadmin.googleapis.com/v1beta/properties?pageSize=200";
    const d2 = await fetchJson<any>(url2, { method: "GET", accessToken });
    const list = d2?.properties ?? [];
    for (const p of list) {
      props.push({ id: String(p?.name ?? "").replace("properties/", ""), displayName: String(p?.displayName ?? "") });
    }
  }
  return props;
}

/** Thin wrapper around GA4 runReport. `params` is the raw Analytics Data API request. */
export async function gaRunReport(
  accessToken: string,
  propertyId: string,
  params: Record<string, any>
) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`;
  return fetchJson<any>(url, { method: "POST", accessToken, body: params });
}

/* ============================================================
   Google Search Console (GSC)
   ============================================================ */

/** Get sites accessible by the user. */
export async function gscListSites(accessToken: string) {
  const url = "https://www.googleapis.com/webmasters/v3/sites/list";
  const data = await fetchJson<any>(url, { method: "GET", accessToken });
  // Normalize to {siteUrl, permissionLevel}
  const raw = Array.isArray(data) ? data : data?.siteEntry ?? data?.items ?? [];
  return raw.map((s: any) => ({
    siteUrl: String(s?.siteUrl ?? s?.url ?? s?.siteUrlCanonical ?? ""),
    permissionLevel: String(s?.permissionLevel ?? s?.perm ?? ""),
  }));
}

/** GSC date-series (clicks, impressions, ctr, position) by day. */
export async function gscTimeseriesClicks(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<Array<{ date: string; clicks: number; impressions: number; ctr: number; position: number }>> {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const body = {
    startDate,
    endDate,
    dimensions: ["date"],
    rowLimit: 5000,
    type: "web",
  };
  const r = await fetchJson<any>(url, { method: "POST", accessToken, body });
  const rows = r?.rows ?? [];
  return rows.map((row: any) => ({
    date: String(row?.keys?.[0] ?? ""),
    clicks: Number(row?.clicks ?? 0),
    impressions: Number(row?.impressions ?? 0),
    ctr: Number(row?.ctr ?? 0),
    position: Number(row?.position ?? 0),
  }));
}

/** GSC top queries between dates (positional form). */
export async function gscTopQueries(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
  rowLimit: number = 1000
): Promise<Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>> {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const body = {
    startDate,
    endDate,
    dimensions: ["query"],
    rowLimit,
    type: "web",
    orderBy: [{ field: "clicks", desc: true }],
  };
  const r = await fetchJson<any>(url, { method: "POST", accessToken, body });
  const rows = r?.rows ?? [];
  return rows.map((row: any) => ({
    query: String(row?.keys?.[0] ?? ""),
    clicks: Number(row?.clicks ?? 0),
    impressions: Number(row?.impressions ?? 0),
    ctr: Number(row?.ctr ?? 0),
    position: Number(row?.position ?? 0),
  }));
}

/* ============================================================
   Google Business Profile (GBP)
   ============================================================ */

/** List GBP locations across all accounts, returns {locations:[{name,title}]} */
export async function gbpListLocations(accessToken: string): Promise<{ locations: Array<{ name: string; title: string }> }> {
  // 1) List accounts
  let accounts: any[] = [];
  try {
    const accRes = await fetchJson<any>("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
      method: "GET",
      accessToken,
    });
    accounts = accRes?.accounts ?? [];
  } catch {
    // ignore; fall back to empty
  }

  const results: Array<{ name: string; title: string }> = [];

  // 2) For each account, list locations (Business Information API)
  for (const acc of accounts) {
    const accName = String(acc?.name ?? "accounts/-");
    const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${encodeURIComponent(
      accName
    )}/locations?readMask=name,title,storeCode,locationName`;
    try {
      const data = await fetchJson<any>(url, { method: "GET", accessToken });
      const locs = data?.locations ?? data?.results ?? [];
      for (const l of locs) {
        results.push({
          name: String(l?.name ?? l?.locationName ?? ""),
          title: String(l?.title ?? l?.storeCode ?? l?.locationName ?? ""),
        });
      }
    } catch {
      // ignore this account
    }
  }

  // If we didn’t get anything, try a blind list on the wildcard path (some setups allow this)
  if (!results.length) {
    try {
      const url = "https://mybusinessbusinessinformation.googleapis.com/v1/accounts/-/locations?readMask=name,title,storeCode,locationName";
      const data = await fetchJson<any>(url, { method: "GET", accessToken });
      const locs = data?.locations ?? data?.results ?? [];
      for (const l of locs) {
        results.push({
          name: String(l?.name ?? l?.locationName ?? ""),
          title: String(l?.title ?? l?.storeCode ?? l?.locationName ?? ""),
        });
      }
    } catch {
      // swallow
    }
  }

  return { locations: results };
}

/* ============================================================
   Drive & Sheets (for Settings storage)
   ============================================================ */

export async function driveFindOrCreateSpreadsheet(accessToken: string, title: string): Promise<string> {
  // Search for existing spreadsheet with the same name
  const q = encodeURIComponent(`mimeType='application/vnd.google-apps.spreadsheet' and name='${title.replace(/'/g, "\\'")}' and trashed=false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`;
  const search = await fetchJson<any>(searchUrl, { method: "GET", accessToken });
  const found = search?.files?.[0];
  if (found?.id) return found.id;

  // Create a fresh spreadsheet
  const createUrl = "https://sheets.googleapis.com/v4/spreadsheets";
  const created = await fetchJson<any>(createUrl, {
    method: "POST",
    accessToken,
    body: { properties: { title } },
  });
  return String(created?.spreadsheetId ?? "");
}

/** Sheets values.get */
export async function sheetsGet(accessToken: string, spreadsheetId: string, rangeA1: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(rangeA1)}?majorDimension=ROWS`;
  return fetchJson<any>(url, { method: "GET", accessToken });
}

/** Sheets values.append (RAW) */
export async function sheetsAppend(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  values: any[][]
) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=RAW`;
  return fetchJson<any>(url, {
    method: "POST",
    accessToken,
    body: { range: sheetName, majorDimension: "ROWS", values },
  });
}

/* ============================================================
   Compatibility Aliases (DO NOT DUPLICATE ABOVE EXPORTS)
   ============================================================ */

// Older routes imported these names; keep them working without duplicate exports.
export { gscListSites as gscSites };

// Allow calling top-queries with object arg {startDate,endDate,rowLimit}
export async function gscTopQueriesObject(
  accessToken: string,
  siteUrl: string,
  opts: { startDate: string; endDate: string; rowLimit?: number }
) {
  return gscTopQueries(accessToken, siteUrl, opts.startDate, opts.endDate, opts.rowLimit);
}

// Some legacy code used `gscQuery` for top queries.
export { gscTopQueriesObject as gscQuery };

// Explicitly export the main helpers (single source of truth)
export {
  // GA
  gaListProperties as _gaListProperties,
  gaRunReport as _gaRunReport,
  // GSC
  gscTimeseriesClicks as _gscTimeseriesClicks,
  gscTopQueries as _gscTopQueries,
  // GBP
  gbpListLocations as _gbpListLocations,
  // Sheets/Drive
  driveFindOrCreateSpreadsheet as _driveFindOrCreateSpreadsheet,
  sheetsGet as _sheetsGet,
  sheetsAppend as _sheetsAppend,
};
