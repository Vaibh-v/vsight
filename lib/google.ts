/* lib/google.ts
 * Central Google helpers used by API routes and pages.
 * All functions below expect a valid OAuth access token (NextAuth Google provider).
 */

type Json = Record<string, any> | undefined;

async function fetchJson(
  url: string,
  init: RequestInit & { accessToken: string }
): Promise<any> {
  const { accessToken, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": rest.body ? "application/json" : "application/json",
      ...(rest.headers || {}),
    },
  });

  // Try to parse JSON even on error to surface Google error details
  const text = await res.text();
  let parsed: any;
  try { parsed = text ? JSON.parse(text) : undefined; } catch { parsed = undefined; }

  if (!res.ok) {
    const code = parsed?.error?.code ?? res.status;
    const message =
      parsed?.error?.message ||
      parsed?.message ||
      `HTTP ${res.status} ${res.statusText}`;
    throw new Error(`${code}: ${message}`);
  }
  return parsed;
}

/* ----------------------------- Google Analytics 4 ----------------------------- */

/** List GA4 properties for the user (flattened). */
export async function gaListProperties(accessToken: string) {
  // Best coverage is via account summaries; they include property summaries.
  const url = "https://analyticsadmin.googleapis.com/v1beta/accountSummaries";
  const data = await fetchJson(url, { method: "GET", accessToken });

  // Normalize to { id, displayName }
  const out: Array<{ id: string; displayName: string }> = [];
  for (const acc of data?.accountSummaries || []) {
    for (const p of acc?.propertySummaries || []) {
      if (p?.property?.startsWith("properties/")) {
        out.push({
          id: String(p.property.split("/")[1]),
          displayName: String(p.displayName || p.property),
        });
      }
    }
  }
  return { properties: out };
}

/** Run a GA4 report via Analytics Data API. */
export async function gaRunReport(
  accessToken: string,
  propertyId: string,
  body: {
    dimensions?: Array<{ name: string }>;
    metrics?: Array<{ name: string }>;
    dateRanges: Array<{ startDate: string; endDate: string }>;
    limit?: string | number;
    orderBys?: Array<any>;
    dimensionFilter?: any;
    metricFilter?: any;
  }
) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(
    propertyId
  )}:runReport`;
  const payload = {
    dimensions: body.dimensions || [],
    metrics: body.metrics || [],
    dateRanges: body.dateRanges || [],
    limit: body.limit ?? undefined,
    orderBys: body.orderBys ?? undefined,
    dimensionFilter: body.dimensionFilter ?? undefined,
    metricFilter: body.metricFilter ?? undefined,
  };
  const data = await fetchJson(url, {
    method: "POST",
    accessToken,
    body: JSON.stringify(payload),
  });
  return data;
}

/* ----------------------------- Google Search Console ----------------------------- */

/** List GSC verified sites for the user. */
export async function gscListSites(accessToken: string) {
  const url = "https://searchconsole.googleapis.com/webmasters/v3/sites";
  const data = await fetchJson(url, { method: "GET", accessToken });

  // API returns array of site entries with siteUrl / permissionLevel
  const sites: Array<{ siteUrl: string; permissionLevel?: string }> = (data || [])
    .filter((s: any) => s?.siteUrl)
    .map((s: any) => ({ siteUrl: s.siteUrl, permissionLevel: s.permissionLevel }));

  return { sites };
}

/** Generic GSC searchAnalytics.query wrapper. */
export async function gscQuery(
  accessToken: string,
  siteUrl: string,
  body: {
    startDate: string;
    endDate: string;
    dimensions?: string[];
    rowLimit?: number;
    dimensionFilterGroups?: any[];
    aggregationType?: "auto" | "byPage" | "byProperty";
    type?: "web" | "image" | "video" | "news" | string;
  }
) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;

  const payload: any = {
    startDate: body.startDate,
    endDate: body.endDate,
    dimensions: body.dimensions || [],
    rowLimit: body.rowLimit ?? 25000,
    dimensionFilterGroups: body.dimensionFilterGroups ?? undefined,
    aggregationType: body.aggregationType ?? undefined,
    searchType: body.type || "web",
  };

  const data = await fetchJson(url, {
    method: "POST",
    accessToken,
    body: JSON.stringify(payload),
  });

  // Always normalize to .rows: Array<{keys?:string[]; clicks; impressions; ctr; position}>
  return { rows: Array.isArray(data?.rows) ? data.rows : [] };
}

/** Timeseries helper: daily clicks/impressions/ctr/position. */
export async function gscTimeseriesClicks(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string
) {
  const { rows } = await gscQuery(accessToken, siteUrl, {
    startDate,
    endDate,
    dimensions: ["date"],
    rowLimit: 25000,
    type: "web",
  });

  const series: Array<{
    date: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }> = (rows || []).map((r: any) => ({
    date: String(r?.keys?.[0] || ""),
    clicks: Number(r?.clicks || 0),
    impressions: Number(r?.impressions || 0),
    ctr: Number(r?.ctr || 0),
    position: Number(r?.position || 0),
  }));

  return { data: series };
}

/** Top queries helper (default top 10). */
export async function gscTopQueries(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
  rowLimit = 10
) {
  const { rows } = await gscQuery(accessToken, siteUrl, {
    startDate,
    endDate,
    dimensions: ["query"],
    rowLimit,
    type: "web",
  });

  const out = (rows || []).map((r: any) => ({
    query: String(r?.keys?.[0] || ""),
    clicks: Number(r?.clicks || 0),
    impressions: Number(r?.impressions || 0),
    ctr: Number(r?.ctr || 0),
    position: Number(r?.position || 0),
  }));

  return { rows: out };
}

/* --------------------------------- Google Drive / Sheets --------------------------------- */

/** Find a spreadsheet by exact title; if missing, create it. Returns spreadsheetId. */
export async function driveFindOrCreateSpreadsheet(
  accessToken: string,
  title: string
): Promise<string> {
  // 1) Drive: search by name and spreadsheet mimeType
  const q = encodeURIComponent(
    `name='${title.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
  );
  const driveList = await fetchJson(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`,
    { method: "GET", accessToken }
  );

  const existing = driveList?.files?.[0]?.id;
  if (existing) return existing;

  // 2) Create spreadsheet via Sheets API
  const created = await fetchJson(
    "https://sheets.googleapis.com/v4/spreadsheets",
    {
      method: "POST",
      accessToken,
      body: JSON.stringify({ properties: { title } }),
    }
  );

  const spreadsheetId = String(created?.spreadsheetId || "");
  if (!spreadsheetId) throw new Error("Failed to create spreadsheet");
  return spreadsheetId;
}

/** Sheets values.get wrapper. */
export async function sheetsGet(
  accessToken: string,
  spreadsheetId: string,
  range: string
): Promise<{ values: string[][] }> {
  const data = await fetchJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(range)}`,
    { method: "GET", accessToken }
  );
  return { values: Array.isArray(data?.values) ? data.values : [] };
}

/** Sheets values.append wrapper (RAW insert). */
export async function sheetsAppend(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  values: Array<Array<string | number>>
): Promise<void> {
  await fetchJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(
      `${sheetName}!A:Z`
    )}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify({ values }),
    }
  );
}

/* ------------------------ Google Business Profile (GBP) ------------------------ */

/** List GBP locations (name/title) across all accounts the user has. */
export async function gbpListLocations(accessToken: string) {
  // 1) List accounts
  const accounts = await fetchJson(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    { method: "GET", accessToken }
  );
  const accountNames: string[] = (accounts?.accounts || [])
    .map((a: any) => a?.name)
    .filter(Boolean);

  const results: Array<{ name: string; title: string }> = [];

  // 2) For each account, list locations
  for (const accountName of accountNames) {
    const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`;
    try {
      const loc = await fetchJson(url, { method: "GET", accessToken });
      for (const l of loc?.locations || []) {
        results.push({
          name: String(l?.name || ""), // e.g., "locations/12345678901234567890"
          title: String(l?.title || l?.storeCode || l?.locationName || ""),
        });
      }
    } catch {
      // Skip accounts we cannot read
    }
  }

  return { locations: results };
}

/**
 * Fetch GBP Search Keyword Impressions for last ~3 months (Business Profile Performance API).
 * Returns aggregated list of { query, impressions }.
 * Note: Requires scope: https://www.googleapis.com/auth/business.manage
 */
export async function gbpKeywordsLast3M(
  accessToken: string,
  gbpLocationName: string // e.g., "locations/12345678901234567890"
) {
  // The numeric ID portion after "locations/"
  const id = String(gbpLocationName || "").split("/")[1];
  if (!id) return { rows: [] };

  // 3 most recent months from today (performance API is monthly)
  const now = new Date();
  const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const m0 = ym(new Date(now.getFullYear(), now.getMonth(), 1));
  const m1 = ym(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const m2 = ym(new Date(now.getFullYear(), now.getMonth() - 2, 1));

  const url = `https://businessprofileperformance.googleapis.com/v1/locations/${id}:fetchSearchKeywordImpressionsMonthly`;
  const payload = {
    monthlyRange: { startMonth: { year: Number(m2.split("-")[0]), month: Number(m2.split("-")[1]) },
                    endMonth:   { year: Number(m0.split("-")[0]), month: Number(m0.split("-")[1]) } },
    // Enumerations: SEARCH_TYPE_WEB is typical organic web impressions
    searchType: "SEARCH_TYPE_WEB"
  };

  let data: any;
  try {
    data = await fetchJson(url, {
      method: "POST",
      accessToken,
      body: JSON.stringify(payload),
    });
  } catch {
    // Fallback graceful empty set if permissions aren’t granted
    return { rows: [] };
  }

  // Aggregate by keyword across returned months
  const agg = new Map<string, number>();
  for (const row of data?.searchKeywordsCounts || []) {
    const keyword = String(row?.searchKeyword || "");
    const months = Array.isArray(row?.monthlyCounts) ? row.monthlyCounts : [];
    const sum = months.reduce((acc: number, m: any) => acc + Number(m?.count || 0), 0);
    if (keyword) agg.set(keyword, (agg.get(keyword) || 0) + sum);
  }

  const rows = Array.from(agg.entries())
    .map(([query, impressions]) => ({ query, impressions }))
    .sort((a, b) => b.impressions - a.impressions);

  return { rows };
}
