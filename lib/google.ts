// lib/google.ts

// ---------- tiny fetch helper ----------
type FetchOpts = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  accessToken?: string;
  body?: any;
  headers?: Record<string, string>;
};

async function fetchJson(url: string, opts: FetchOpts = {}) {
  const { method = "GET", accessToken, body, headers = {} } = opts;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}: ${text}`);
  }
  // Some Google endpoints legitimately return 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

// ===================================================================================
// GA4
// ===================================================================================

/** List GA4 properties (flattened) using Admin API account summaries. */
export async function gaListProperties(accessToken: string) {
  const url = "https://analyticsadmin.googleapis.com/v1beta/accountSummaries";
  const data = await fetchJson(url, { accessToken });
  const summaries: any[] = Array.isArray(data?.accountSummaries)
    ? data.accountSummaries
    : [];
  const out: { account: string; property: string; propertyId: string; displayName: string }[] = [];
  for (const a of summaries) {
    const account = String(a?.name || ""); // "accountSummaries/{id}" (not used further)
    const props: any[] = Array.isArray(a?.propertySummaries) ? a.propertySummaries : [];
    for (const p of props) {
      const property = String(p?.property || ""); // "properties/{id}"
      const propertyId = property.replace("properties/", "");
      out.push({
        account,
        property,
        propertyId,
        displayName: String(p?.displayName || propertyId),
      });
    }
  }
  return out;
}

/** Run a GA4 report. Accepts string[] OR {name:string}[] for dimensions/metrics. */
export async function gaRunReport(
  accessToken: string,
  propertyId: string,
  opts: {
    dimensions?: (string | { name: string })[];
    metrics?: (string | { name: string })[];
    dateRanges: { startDate: string; endDate: string }[];
    limit?: number;
  }
) {
  const normalize = (arr?: (string | { name: string })[]) =>
    (arr || []).map((d: any) => (typeof d === "string" ? { name: d } : d));
  const body: any = {
    dimensions: normalize(opts.dimensions),
    metrics: normalize(opts.metrics),
    dateRanges: opts.dateRanges,
  };
  if (opts.limit) body.limit = opts.limit;

  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(
    propertyId
  )}:runReport`;

  const data = await fetchJson(url, { method: "POST", accessToken, body });
  return data; // includes rows, dimensionHeaders, metricHeaders, etc.
}

// ===================================================================================
// Google Search Console
// ===================================================================================

type GscQueryOpts = {
  startDate: string;
  endDate: string;
  rowLimit?: number;
  type?: string;
  dimensionFilterGroups?: any[];
  // keep backward compat: callers sometimes pass dimensions; we accept it
  dimensions?: string[];
};

/** Low-level GSC Search Analytics query; returns { rows: [...] } */
export async function gscQuery(
  accessToken: string,
  siteUrl: string,
  opts: GscQueryOpts
) {
  const {
    startDate,
    endDate,
    rowLimit,
    type,
    dimensionFilterGroups,
    dimensions = ["query"],
  } = opts;

  const body: any = {
    startDate,
    endDate,
    dimensions, // GSC expects string[]
  };
  if (rowLimit) body.rowLimit = rowLimit;
  if (type) body.type = type;
  if (dimensionFilterGroups) body.dimensionFilterGroups = dimensionFilterGroups;

  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;
  const data = await fetchJson(url, { method: "POST", accessToken, body });
  const rows: any[] = Array.isArray(data?.rows) ? data.rows : [];
  return { rows };
}

/** Convenience: top queries (returns array of rows). */
export async function gscTopQueries(
  accessToken: string,
  siteUrl: string,
  opts: { startDate: string; endDate: string; rowLimit?: number; type?: string; dimensionFilterGroups?: any[] }
) {
  const { rows } = await gscQuery(accessToken, siteUrl, {
    ...opts,
    dimensions: ["query"],
  });
  return rows;
}

/** Convenience: date timeseries clicks/impressions/ctr/position (array). */
export async function gscTimeseriesClicks(
  accessToken: string,
  siteUrl: string,
  opts: { startDate: string; endDate: string; rowLimit?: number; type?: string }
) {
  const { rows } = await gscQuery(accessToken, siteUrl, {
    ...opts,
    dimensions: ["date"],
  });
  // Map to simple shape the UI expects
  return rows.map((r: any) => {
    const date = String(r?.keys?.[0] || "");
    return {
      date,
      clicks: Number(r?.clicks || 0),
      impressions: Number(r?.impressions || 0),
      ctr: Number(r?.ctr || 0),
      position: Number(r?.position || 0),
    };
  });
}

/** List verified GSC sites. */
export async function gscSites(accessToken: string) {
  const url = "https://www.googleapis.com/webmasters/v3/sites/list";
  const data = await fetchJson(url, { accessToken });
  const siteEntry: any[] = Array.isArray(data?.siteEntry) ? data.siteEntry : [];
  return siteEntry
    .filter((s) => String(s?.permissionLevel || "").toLowerCase() !== "siteunverifieduser")
    .map((s) => ({ siteUrl: String(s?.siteUrl || ""), permissionLevel: String(s?.permissionLevel || "") }));
}

// ===================================================================================
// Google Business Profile (GBP)
// ===================================================================================

/**
 * Lists GBP locations for the authenticated user.
 * Returns a minimal, consistent shape: { name, title }[]
 */
export async function gbpListLocations(
  accessToken: string,
  accountId?: string
): Promise<{ name: string; title: string }[]> {
  const listAccountsV1 = async (): Promise<string[]> => {
    const url = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";
    const data = await fetchJson(url, { accessToken });
    const accounts: any[] = Array.isArray(data?.accounts) ? data.accounts : [];
    return accounts
      .map((a) => String(a?.name || ""))
      .filter((s) => s.startsWith("accounts/"))
      .map((s) => s.replace("accounts/", ""));
  };

  const listLocationsV1 = async (accId: string) => {
    const url = `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${encodeURIComponent(
      accId
    )}/locations?readMask=name,title`;
    const data = await fetchJson(url, { accessToken });
    const locs: any[] = Array.isArray(data?.locations) ? data.locations : [];
    return locs.map((l) => ({
      name: String(l?.name || ""),
      title: String(l?.title || ""),
    }));
  };

  const listAccountsV4 = async (): Promise<string[]> => {
    const url = "https://mybusiness.googleapis.com/v4/accounts";
    const data = await fetchJson(url, { accessToken });
    const accounts: any[] = Array.isArray(data?.accounts) ? data.accounts : [];
    return accounts.map((a) => String(a?.name || "")).map((s) => s.replace("accounts/", ""));
  };

  const listLocationsV4 = async (accId: string) => {
    const url = `https://mybusiness.googleapis.com/v4/accounts/${encodeURIComponent(
      accId
    )}/locations?readMask=locationName,name`;
    const data = await fetchJson(url, { accessToken });
    const locs: any[] = Array.isArray(data?.locations) ? data.locations : [];
    return locs.map((l) => ({
      name: String(l?.name || ""),
      title: String(l?.locationName || l?.storeName || ""),
    }));
  };

  const out: { name: string; title: string }[] = [];

  if (accountId) {
    try {
      out.push(...(await listLocationsV1(accountId)));
    } catch {}
    if (!out.length) {
      try {
        out.push(...(await listLocationsV4(accountId)));
      } catch {}
    }
    return dedupeByName(out);
  }

  let accounts: string[] = [];
  try {
    accounts = await listAccountsV1();
  } catch {}
  if (!accounts.length) {
    try {
      accounts = await listAccountsV4();
    } catch {}
  }

  for (const accId of accounts) {
    let got: { name: string; title: string }[] = [];
    try {
      got = await listLocationsV1(accId);
    } catch {}
    if (!got.length) {
      try {
        got = await listLocationsV4(accId);
      } catch {}
    }
    out.push(...got);
  }

  return dedupeByName(out);
}

function dedupeByName(rows: { name: string; title: string }[]) {
  const seen = new Set<string>();
  return rows.filter((l) => {
    if (!l.name) return false;
    if (seen.has(l.name)) return false;
    seen.add(l.name);
    return true;
  });
}

// ===================================================================================
// Drive / Sheets (Vault & Tracker storage)
// ===================================================================================

/** Find or create a spreadsheet by name; returns { id, name }. */
export async function driveFindOrCreateSpreadsheet(accessToken: string, name: string) {
  // Try find by name (exact)
  const q = encodeURIComponent(`mimeType='application/vnd.google-apps.spreadsheet' and name='${name}' and trashed=false`);
  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`;
  const found = await fetchJson(listUrl, { accessToken });
  const files: any[] = Array.isArray(found?.files) ? found.files : [];
  if (files.length) return { id: String(files[0].id), name: String(files[0].name) };

  // Create via Sheets API
  const createUrl = "https://sheets.googleapis.com/v4/spreadsheets";
  const created = await fetchJson(createUrl, {
    method: "POST",
    accessToken,
    body: { properties: { title: name } },
  });
  return { id: String(created?.spreadsheetId || ""), name: String(created?.properties?.title || name) };
}

/** Get range values from a sheet. */
export async function sheetsGet(accessToken: string, spreadsheetId: string, rangeA1: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(rangeA1)}`;
  const data = await fetchJson(url, { accessToken });
  return { values: Array.isArray(data?.values) ? data.values : [] };
}

/** Append values to a sheet tab (range = tab name). */
export async function sheetsAppend(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  values: any[][]
) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`;
  const body = { majorDimension: "ROWS", values };
  const data = await fetchJson(url, { method: "POST", accessToken, body });
  return data;
}

// ===================================================================================
// Misc (safe stub so tracker route compiles even if SERP API not configured)
// ===================================================================================

/** Returns a SERP top URL for a query if you later wire a search API; safe no-op now. */
export async function serpTopUrl(_query: string): Promise<string> {
  // Intentionally return empty to avoid runtime failures when no SERP key is configured.
  return "";
}
