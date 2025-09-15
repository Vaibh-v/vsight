/* lib/google.ts
 * Unified Google helpers for VSight (GA4, GSC, GBP, Drive/Sheets)
 * Server-side only.
 */

type FetchJsonOpts = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  accessToken?: string;
  body?: any;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
};

export async function fetchJson(url: string, opts: FetchJsonOpts = {}) {
  const { method = "GET", accessToken, body, headers = {}, query } = opts;

  const qs =
    query &&
    Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");

  const fullUrl = qs ? `${url}${url.includes("?") ? "&" : "?"}${qs}` : url;

  const res = await fetch(fullUrl, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${fullUrl}\n${text}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return null;
  return (await res.json()) as any;
}

/* -------------------------------- GA4 -------------------------------- */

export type GaRunReportRequest =
  | {
      dimensions?: string[];
      metrics?: string[];
      dateRanges: { startDate: string; endDate: string }[];
      [k: string]: any;
    }
  | {
      dimensions?: Array<{ name: string }>;
      metrics?: Array<{ name: string }>;
      dateRanges: { startDate: string; endDate: string }[];
      [k: string]: any;
    };

function normalizeGaFields(list?: string[] | Array<{ name: string }>) {
  if (!list) return undefined;
  return list.map((d: any) =>
    typeof d === "string" ? { name: d } : { name: String(d?.name || "") }
  );
}

export async function gaListProperties(
  accessToken: string
): Promise<Array<{ id: string; name: string }>> {
  const url = "https://analyticsadmin.googleapis.com/v1beta/accountSummaries";
  const data = await fetchJson(url, { accessToken });
  const accs: any[] = Array.isArray(data?.accountSummaries) ? data.accountSummaries : [];
  const out: Array<{ id: string; name: string }> = [];
  for (const a of accs) {
    const props: any[] = Array.isArray(a?.propertySummaries) ? a.propertySummaries : [];
    for (const p of props) {
      const id = String(p?.property || "").replace(/^properties\//, "");
      const name = String(p?.displayName || id);
      out.push({ id, name });
    }
  }
  return out;
}

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
    dimensions: normalizeGaFields((request as any).dimensions),
    metrics: normalizeGaFields((request as any).metrics),
  };

  return await fetchJson(url, { method: "POST", accessToken, body });
}

/* ------------------------- Google Search Console ------------------------- */

export type GscQueryOpts = {
  startDate: string;
  endDate: string;
  dimensions?: string[];
  rowLimit?: number;
  type?: string;
  dimensionFilterGroups?: any[];
};

export type GscRow =
  | { date: string; clicks: number; impressions: number; ctr: number; position: number }
  | { query: string; clicks: number; impressions: number; ctr: number; position: number; page?: string }
  | { page: string; clicks: number; impressions: number; ctr: number; position: number; query?: string };

export async function gscSites(accessToken: string): Promise<Array<{ siteUrl: string }>> {
  const url = "https://searchconsole.googleapis.com/webmasters/v3/sites";
  const data = await fetchJson(url, { accessToken });
  const siteEntry: any[] = Array.isArray(data?.siteEntry) ? data.siteEntry : [];
  return siteEntry
    .filter((s) => s?.permissionLevel && s?.siteUrl)
    .map((s) => ({ siteUrl: String(s.siteUrl) }));
}

export async function gscQuery(
  accessToken: string,
  siteUrl: string,
  opts: GscQueryOpts
): Promise<{ rows: GscRow[] }> {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;

  const resp = await fetchJson(url, {
    method: "POST",
    accessToken,
    body: {
      startDate: opts.startDate,
      endDate: opts.endDate,
      dimensions: opts.dimensions,
      rowLimit: opts.rowLimit,
      type: opts.type || "web",
      dimensionFilterGroups: opts.dimensionFilterGroups,
    },
  });

  const rows: any[] = Array.isArray(resp?.rows) ? resp.rows : [];

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
    const query = String(keys[0] || "");
    return { query, clicks, impressions, ctr, position };
  };

  return { rows: rows.map(mapRow) };
}

/** Top queries — accepts positional or object form for backward compatibility. */
export async function gscTopQueries(
  accessToken: string,
  siteUrl: string,
  startOrOpts: string | { startDate: string; endDate: string; limit?: number },
  endMaybe?: string,
  limitPos?: number
): Promise<Array<Extract<GscRow, { query: string }>>> {
  const startDate =
    typeof startOrOpts === "string" ? startOrOpts : startOrOpts.startDate;
  const endDate =
    typeof startOrOpts === "string" ? String(endMaybe) : startOrOpts.endDate;
  const limit = typeof startOrOpts === "string" ? limitPos ?? 10 : startOrOpts.limit ?? 10;

  const { rows } = await gscQuery(accessToken, siteUrl, {
    startDate,
    endDate,
    dimensions: ["query"],
    rowLimit: limit,
    type: "web",
  });

  return rows.filter((r: any) => "query" in r) as any[];
}

/** Time series (date) — accepts positional OR object form. */
export async function gscTimeseriesClicks(
  accessToken: string,
  siteUrl: string,
  startOrOpts: string | { startDate: string; endDate: string },
  endMaybe?: string
): Promise<Array<Extract<GscRow, { date: string }>>> {
  const startDate =
    typeof startOrOpts === "string" ? startOrOpts : startOrOpts.startDate;
  const endDate =
    typeof startOrOpts === "string" ? String(endMaybe) : startOrOpts.endDate;

  const { rows } = await gscQuery(accessToken, siteUrl, {
    startDate,
    endDate,
    dimensions: ["date"],
    type: "web",
  });

  return rows.filter((r: any) => "date" in r) as any[];
}

/* ------------------------- Google Business Profile ------------------------- */

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

export async function gbpListLocations(
  accessToken: string,
  accountId?: string
): Promise<Array<{ name: string; title: string; storeCode?: string; primaryCategory?: string }>> {
  let accName = accountId ? `accounts/${accountId}` : "";
  if (!accName) {
    const accs = await gbpListAccounts(accessToken);
    if (!accs.length) return [];
    accName = `accounts/${accs[0].id}`;
  }

  const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${accName}/locations`;
  const data = await fetchJson(url, {
    accessToken,
    query: {
      readMask: "name,title,storeCode,primaryCategory",
      pageSize: 100,
    },
  });

  const locations: any[] = Array.isArray(data?.locations) ? data.locations : [];
  return locations.map((l) => ({
    name: String(l?.name || ""),
    title: String(l?.title || ""),
    storeCode: l?.storeCode ? String(l.storeCode) : undefined,
    primaryCategory: String(l?.primaryCategory?.displayName || ""),
  }));
}

/* --------------------------- Drive + Sheets --------------------------- */

export async function driveFindOrCreateSpreadsheet(
  accessToken: string,
  name: string
): Promise<{ id: string; name: string }> {
  const search = await fetchJson("https://www.googleapis.com/drive/v3/files", {
    accessToken,
    query: {
      q:
        `name='${name.replace(/'/g, "\\'")}' and ` +
        `mimeType='application/vnd.google-apps.spreadsheet' and 'me' in owners`,
      pageSize: 1,
      fields: "files(id,name)",
      spaces: "drive",
    },
  });

  const found = Array.isArray(search?.files) ? search.files[0] : null;
  if (found?.id) {
    return { id: String(found.id), name: String(found.name || name) };
  }
  const created = await fetchJson("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    accessToken,
    body: { properties: { title: name } },
  });

  return { id: String(created?.spreadsheetId || ""), name };
}

export async function sheetsAppend(
  accessToken: string,
  spreadsheet: string | { id: string },
  sheetName: string,
  values: any[][]
) {
  const spreadsheetId = typeof spreadsheet === "string" ? spreadsheet : spreadsheet.id;
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

export async function sheetsGet(
  accessToken: string,
  spreadsheet: string | { id: string },
  a1Range: string
): Promise<{ values?: any[][] }> {
  const spreadsheetId = typeof spreadsheet === "string" ? spreadsheet : spreadsheet.id;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(a1Range)}`;
  return await fetchJson(url, { accessToken });
}

/* ------------------------------ Misc ------------------------------ */

export async function serpTopUrl(_query: string): Promise<string> {
  // Safe placeholder.
  return "";
}
