// lib/google.ts

// ---------- Small helpers ----------
async function fetchJson(
  url: string,
  opts: { method?: string; accessToken?: string; body?: unknown; headers?: Record<string,string> } = {}
) {
  const { method = "GET", accessToken, body, headers = {} } = opts;
  const res = await fetch(url, {
    method,
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) {
    const msg = (json?.error?.message || json?.error_description || json?.message || text || `HTTP ${res.status}`);
    throw new Error(msg);
  }
  return json ?? {};
}

function toYYYYMMDD(d: string) {
  // accepts "YYYY-MM-DD" or "YYYYMMDD" and returns "YYYYMMDD"
  if (/^\d{8}$/.test(d)) return d;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (m) return `${m[1]}${m[2]}${m[3]}`;
  return d;
}

// ---------- GA4 ----------
/**
 * Run a GA4 report. Use string names for metrics/dimensions.
 * Returns { rows: Array<{ date?: string; [k:string]: any }> }
 */
export async function gaRunReport(
  accessToken: string,
  propertyId: string,
  opts: {
    metrics: string[];
    dimensions?: string[];
    dateRanges: Array<{ startDate: string; endDate: string }>;
    limit?: number;
  }
): Promise<{ rows: Array<Record<string, any>> }> {
  const body = {
    metrics: (opts.metrics || []).map((m) => ({ name: String(m) })),
    dimensions: (opts.dimensions || []).map((d) => ({ name: String(d) })),
    dateRanges: opts.dateRanges,
    limit: opts.limit ?? 1000,
  };

  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`;
  const data = await fetchJson(url, { method: "POST", accessToken, body });

  const dimHeaders = (data?.dimensionHeaders || []).map((h: any) => h?.name);
  const metHeaders = (data?.metricHeaders || []).map((h: any) => h?.name);

  const rows = (data?.rows || []).map((r: any) => {
    const out: Record<string, any> = {};
    (r?.dimensionValues || []).forEach((dv: any, i: number) => {
      out[dimHeaders[i]] = dv?.value;
      // Make common convenience: if "date" exists as YYYYMMDD, also provide ISO date.
      if (dimHeaders[i] === "date") {
        const v = String(dv?.value || "");
        if (/^\d{8}$/.test(v)) out.date = `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}`;
      }
    });
    (r?.metricValues || []).forEach((mv: any, i: number) => {
      const raw = mv?.value;
      const n = raw === undefined ? 0 : Number(raw);
      out[metHeaders[i]] = Number.isFinite(n) ? n : raw;
    });
    return out;
  });

  return { rows };
}

// ---------- GSC (Search Console) ----------
type GscQueryReq = {
  startDate: string;
  endDate: string;
  dimensions?: string[];
  rowLimit?: number;
  type?: string; // "web" default
  dimensionFilterGroups?: any[];
};

export async function gscQuery(
  accessToken: string,
  siteUrl: string,
  req: GscQueryReq
): Promise<{ rows: any[] }> {
  const body: any = {
    startDate: req.startDate,
    endDate: req.endDate,
    type: req.type || "web",
    rowLimit: req.rowLimit ?? 1000,
  };
  if (req.dimensions && req.dimensions.length) body.dimensions = req.dimensions;
  if (req.dimensionFilterGroups) body.dimensionFilterGroups = req.dimensionFilterGroups;

  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const data = await fetchJson(url, { method: "POST", accessToken, body });
  const rows: any[] = Array.isArray(data?.rows) ? data.rows : [];
  return { rows };
}

/** Timeseries of clicks by date */
export async function gscTimeseriesClicks(
  accessToken: string,
  siteUrl: string,
  opts: { startDate: string; endDate: string; rowLimit?: number }
): Promise<Array<{ date: string; clicks: number; impressions: number; ctr: number; position: number }>> {
  const { rows } = await gscQuery(accessToken, siteUrl, {
    startDate: opts.startDate,
    endDate: opts.endDate,
    rowLimit: opts.rowLimit ?? 1000,
    dimensions: ["date"],
  });

  return rows.map((r: any) => {
    const dateKey = r?.keys?.[0] || ""; // "YYYY-MM-DD"
    return {
      date: String(dateKey),
      clicks: Number(r?.clicks || 0),
      impressions: Number(r?.impressions || 0),
      ctr: Number(r?.ctr || 0),
      position: Number(r?.position || 0),
    };
  });
}

/** Top queries for a period */
export async function gscTopQueries(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
  rowLimit = 10
): Promise<Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>> {
  const { rows } = await gscQuery(accessToken, siteUrl, {
    startDate, endDate, rowLimit, dimensions: ["query"],
  });

  return rows.map((r: any) => ({
    query: String(r?.keys?.[0] || ""),
    clicks: Number(r?.clicks || 0),
    impressions: Number(r?.impressions || 0),
    ctr: Number(r?.ctr || 0),
    position: Number(r?.position || 0),
  }));
}

/** List Search Console sites */
export async function gscSites(accessToken: string): Promise<string[]> {
  const url = "https://www.googleapis.com/webmasters/v3/sites/list";
  const data = await fetchJson(url, { accessToken });
  const siteEntries: any[] = Array.isArray(data?.siteEntry) ? data.siteEntry : [];
  // Return the "siteUrl" string form used in API calls, e.g. "sc-domain:example.com" or "https://example.com/"
  return siteEntries.map((s: any) => String(s?.siteUrl || "")).filter(Boolean);
}

// ---------- GBP (Business Profile) ----------
/** List GBP locations. If accountId omitted, uses the first account. */
export async function gbpListLocations(
  accessToken: string,
  accountId?: string
): Promise<Array<{ name: string; title?: string; storeCode?: string; primaryCategory?: string }>> {
  // 1) list accounts if none provided
  let acc = accountId;
  if (!acc) {
    const accounts = await gbpListAccounts(accessToken);
    acc = accounts[0]?.name?.split("/")[1]; // "accounts/123" -> "123"
  }
  if (!acc) return [];

  // 2) list locations for that account
  const url = `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${encodeURIComponent(acc)}/locations`;
  const data = await fetchJson(url, { accessToken });
  const locs: any[] = Array.isArray(data?.locations) ? data.locations : [];
  return locs.map((l: any) => ({
    name: String(l?.name || ""),            // e.g. "locations/XXXXXXXX" or "accounts/{acc}/locations/{loc}"
    title: String(l?.title || ""),
    storeCode: l?.storeCode ? String(l.storeCode) : undefined,
    primaryCategory: l?.primaryCategory?.displayName ? String(l.primaryCategory.displayName) : undefined,
  }));
}

async function gbpListAccounts(accessToken: string): Promise<Array<{ name: string; accountName?: string }>> {
  const url = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";
  const data = await fetchJson(url, { accessToken });
  const accounts: any[] = Array.isArray(data?.accounts) ? data.accounts : [];
  return accounts.map((a: any) => ({
    name: String(a?.name || ""), // "accounts/123"
    accountName: a?.accountName ? String(a.accountName) : undefined,
  }));
}

// ---------- Drive & Sheets ----------
/** Finds a spreadsheet by name under Drive root; creates if missing. Returns spreadsheetId string. */
export async function driveFindOrCreateSpreadsheet(
  accessToken: string,
  name: string
): Promise<string> {
  // search
  const q = `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`;
  const list = await fetchJson(listUrl, { accessToken });
  const existing = Array.isArray(list?.files) ? list.files[0] : null;
  if (existing?.id) return String(existing.id);

  // create
  const createUrl = "https://sheets.googleapis.com/v4/spreadsheets";
  const created = await fetchJson(createUrl, { method: "POST", accessToken, body: { properties: { title: name } } });
  const spreadsheetId = String(created?.spreadsheetId || "");
  if (!spreadsheetId) throw new Error("Failed to create spreadsheet");
  return spreadsheetId;
}

export async function sheetsGet(
  accessToken: string,
  spreadsheetId: string,
  rangeA1: string
): Promise<{ values: any[][] }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(rangeA1)}`;
  const data = await fetchJson(url, { accessToken });
  return { values: Array.isArray(data?.values) ? data.values : [] };
}

export async function sheetsAppend(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  values: any[][]
): Promise<void> {
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`;
  await fetchJson(url, { method: "POST", accessToken, body: { values } });
}

// ---------- Utilities used by tracker ----------
/** Optional: try to find a top SERP URL for a query (placeholder, safe no-op). */
export async function serpTopUrl(_query: string): Promise<string> {
  // Intentionally returns empty string to avoid external scraping in serverless.
  return "";
}
