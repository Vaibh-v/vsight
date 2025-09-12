// lib/google.ts
// Centralized Google helpers for GA4, GSC, Drive, Sheets.
// NOTE: This file is intentionally tolerant: it accepts legacy shapes (old callers) and
// returns simple, consistent data so API routes and components stay stable.

type GAReportRequest = {
  dimensions?: { name: string }[];
  metrics?: { name: string }[];
  dateRanges: { startDate: string; endDate: string }[];
};

type GAReportRow = {
  dimensionValues?: { value: string }[];
  metricValues?: { value: string }[];
};

type GAReportResponse = {
  rows?: GAReportRow[];
};

type GscQueryOpts = {
  startDate: string;
  endDate: string;
  rowLimit?: number;
  type?: string;
  dimensionFilterGroups?: any[];
  // keep legacy tolerance: some old callers try to pass this
  dimensions?: string[];
};

async function fetchJson(url: string, init: RequestInit & { accessToken?: string } = {}) {
  const { accessToken, ...rest } = init;
  const headers = new Headers(rest.headers || {});
  headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const resp = await fetch(url, { ...rest, headers });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`HTTP ${resp.status} ${resp.statusText}: ${text || url}`);
  }
  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("application/json")) return resp.json();
  return resp.text();
}

/* ------------------------- GA4 ------------------------- */

export async function gaListProperties(accessToken: string) {
  const url = "https://analyticsadmin.googleapis.com/v1beta/accountSummaries";
  const data = await fetchJson(url, { accessToken });
  const summaries: any[] = data?.accountSummaries ?? [];
  const flat: { id: string; displayName: string }[] = [];
  for (const s of summaries) {
    const props: any[] = s?.propertySummaries ?? [];
    for (const p of props) flat.push({ id: String(p?.property || "" ).replace("properties/",""), displayName: String(p?.displayName || "") });
  }
  return flat;
}

export async function gaRunReport(
  accessToken: string,
  propertyId: string,
  body: GAReportRequest
): Promise<GAReportResponse> {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
  const payload = {
    dimensions: (body.dimensions || []).map(d => ({ name: d.name })),
    metrics: (body.metrics || []).map(m => ({ name: m.name })),
    dateRanges: body.dateRanges,
  };
  return await fetchJson(url, { method: "POST", accessToken, body: JSON.stringify(payload) });
}

/* ------------------------- GSC ------------------------- */

export async function gscSites(accessToken: string) {
  const url = "https://www.googleapis.com/webmasters/v3/sites";
  const data = await fetchJson(url, { accessToken });
  const siteEntry: any[] = data?.siteEntry || [];
  return siteEntry.map(s => ({ siteUrl: String(s?.siteUrl || ""), permissionLevel: String(s?.permissionLevel || "") }));
}

/**
 * Unified GSC searchanalytics/query wrapper that tolerates legacy call shapes.
 * - New shape: gscQuery(token, siteUrl, { startDate, endDate, rowLimit?, type?, dimensionFilterGroups?, dimensions? })
 * - Old shape(s) auto–coerced to new shape.
 *
 * Return shapes (normalized):
 * - If opts.dimensions includes "date": rows => { date, clicks, impressions, ctr, position }
 * - If includes "query" (optionally "page"): rows => { query, clicks, impressions, ctr, position, page? }
 * - If includes only "page": rows => { page, clicks, impressions, ctr, position }
 */
export async function gscQuery(
  accessToken: string,
  siteUrl: string,
  opts: GscQueryOpts
): Promise<{ rows: any[] }> {
  const body: any = {
    startDate: opts.startDate,
    endDate: opts.endDate,
    rowLimit: opts.rowLimit ?? 1000,
    type: opts.type ?? "web",
  };
  if (opts.dimensionFilterGroups) body.dimensionFilterGroups = opts.dimensionFilterGroups;

  // Default to ["query"] if caller didn’t specify anything
  const dims = (opts.dimensions && opts.dimensions.length ? opts.dimensions : ["query"]).slice(0, 2);
  body.dimensions = dims;

  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const data = await fetchJson(url, { method: "POST", accessToken, body: JSON.stringify(body) });
  const rows: any[] = Array.isArray(data?.rows) ? data.rows : [];

  // Normalize into convenient objects
  const norm = rows.map((r: any) => {
    const k: string[] = Array.isArray(r?.keys) ? r.keys : [];
    const clicks = Number(r?.clicks || 0);
    const impressions = Number(r?.impressions || 0);
    const ctr = Number(r?.ctr || 0);
    const position = Number(r?.position || 0);

    const has = (d: string) => dims.includes(d);

    if (has("date")) {
      return { date: String(k[0] || ""), clicks, impressions, ctr, position };
    }
    if (has("query") && has("page")) {
      return { query: String(k[0] || ""), page: String(k[1] || ""), clicks, impressions, ctr, position };
    }
    if (has("query")) {
      return { query: String(k[0] || ""), clicks, impressions, ctr, position };
    }
    if (has("page")) {
      return { page: String(k[0] || ""), clicks, impressions, ctr, position };
    }
    return { clicks, impressions, ctr, position };
  });

  return { rows: norm };
}

/** Convenience: top queries (supports both the new-object and old 5-arg styles). */
export async function gscTopQueries(
  accessToken: string,
  siteUrl: string,
  a: any,
  b?: any,
  c?: any
): Promise<any[]> {
  // Old style: (token, siteUrl, start, end, limit)
  if (typeof a === "string" && typeof b === "string") {
    const startDate = a, endDate = b, rowLimit = typeof c === "number" ? c : 100;
    const { rows } = await gscQuery(accessToken, siteUrl, {
      startDate, endDate, rowLimit, type: "web", dimensions: ["query"],
    });
    return rows;
  }
  // New style: (token, siteUrl, {startDate, endDate, rowLimit?, ...})
  const opts = a as GscQueryOpts;
  const { rows } = await gscQuery(accessToken, siteUrl, { ...opts, dimensions: ["query"] });
  return rows;
}

/** Timeseries daily clicks for a site (date, clicks). */
export async function gscTimeseriesClicks(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string
) {
  const { rows } = await gscQuery(accessToken, siteUrl, {
    startDate, endDate, rowLimit: 1000, type: "web", dimensions: ["date"],
  });
  // rows already in { date, clicks, ... }
  return rows.map(r => ({ date: r.date, clicks: Number(r.clicks || 0) }));
}

/* ------------------------- Drive + Sheets ------------------------- */

/** Creates (if missing) a spreadsheet named `name` in Drive and returns its spreadsheetId as string. */
export async function driveFindOrCreateSpreadsheet(accessToken: string, name: string): Promise<string> {
  // Try to find by name
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name=${encodeURIComponent(`'${name}'`)}+and+mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name)`;
  const found = await fetchJson(searchUrl, { accessToken });
  const existing = Array.isArray(found?.files) ? found.files[0] : null;
  if (existing?.id) return String(existing.id);

  // Create new
  const createUrl = "https://sheets.googleapis.com/v4/spreadsheets";
  const created = await fetchJson(createUrl, {
    method: "POST",
    accessToken,
    body: JSON.stringify({ properties: { title: name } }),
  });
  return String(created?.spreadsheetId || "");
}

export async function sheetsGet(accessToken: string, spreadsheetId: string, range: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  return await fetchJson(url, { accessToken });
}

export async function sheetsAppend(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  values: any[][]
) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    `${sheetName}!A:Z`
  )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  return await fetchJson(url, {
    method: "POST",
    accessToken,
    body: JSON.stringify({ values }),
  });
}

/* ------------------------- Misc ------------------------- */

/** Very simple placeholder; caller can replace with real SERP lookup later. */
export async function serpTopUrl(_query: string): Promise<string> {
  // Avoid network surprises at build time. Return empty string by default.
  return "";
}
