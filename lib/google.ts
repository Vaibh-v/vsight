// lib/google.ts

// Single helper for all Google REST calls
async function gFetch<T>(url: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const text = await res.text();

  // If Google returns an HTML error/consent page, surface a useful error
  if (text.trim().startsWith("<")) {
    throw new Error(
      `Non-JSON response from Google. Likely missing API enablement or scopes. First bytes: ${text.slice(0, 120)}…`
    );
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text}`);

  return text ? (JSON.parse(text) as T) : ({} as T);
}

/* =========================
   GA4 (Admin + Data API)
   ========================= */

/** GA4: list properties via Admin API (account summaries) */
export async function gaListProperties(accessToken: string) {
  const data = await gFetch<{ accountSummaries?: any[] }>(
    "https://analyticsadmin.googleapis.com/v1alpha/accountSummaries?pagesize=200",
    accessToken
  );

  const out: { propertyId: string; displayName: string }[] = [];
  for (const acc of data.accountSummaries || []) {
    for (const p of acc.propertySummaries || []) {
      out.push({
        propertyId: String(p.property).split("/")[1],
        displayName: `${acc.displayName} — ${p.displayName}`,
      });
    }
  }
  return out;
}

/** GA4: runReport (Analytics Data API) */
export async function gaRunReport(accessToken: string, propertyId: string, body: any) {
  return gFetch<any>(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    accessToken,
    { method: "POST", body: JSON.stringify(body) }
  );
}

/* =========================
   Google Search Console
   ========================= */

/** GSC: list sites */
export async function gscSites(accessToken: string) {
  const data = await gFetch<{ siteEntry?: { siteUrl: string; permissionLevel: string }[] }>(
    "https://www.googleapis.com/webmasters/v3/sites",
    accessToken
  );
  // Filter out unverified sites
  return (data.siteEntry || []).filter((s) => s.permissionLevel !== "siteUnverifiedUser");
}

/** GSC: generic query */
export async function gscQuery(accessToken: string, siteUrl: string, body: any) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;
  return gFetch<any>(url, accessToken, { method: "POST", body: JSON.stringify(body) });
}

/** GSC: clicks time-series */
export async function gscTimeseriesClicks(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string
) {
  return gscQuery(accessToken, siteUrl, {
    startDate,
    endDate,
    dimensions: ["date"],
    rowLimit: 25000,
    type: "web",
  });
}

/* =========================
   Google Business Profile
   ========================= */

/** GBP: list locations (via Account Mgmt + Business Information APIs) */
export async function gbpListLocations(accessToken: string) {
  // 1) List accounts
  const accounts = await gFetch<{ accounts?: { name: string }[] }>(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    accessToken
  );

  // 2) For each account, list locations
  const out: { name: string; title: string }[] = [];
  for (const acc of accounts.accounts || []) {
    const locs = await gFetch<{ locations?: { name: string; title: string }[] }>(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title`,
      accessToken
    );
    for (const l of locs.locations || []) {
      out.push({ name: l.name, title: l.title });
    }
  }
  return out;
}

/* =========================
   Google Drive + Sheets
   ========================= */

/** Ensure a spreadsheet exists by name; create if missing. Returns spreadsheetId. */
export async function driveEnsureSpreadsheet(accessToken: string, spreadsheetName: string): Promise<string> {
  // Try to find by name
  const list = await gFetch<{ files?: Array<{ id: string; name: string }> }>(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      `name='${spreadsheetName}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
    )}&fields=files(id,name)`,
    accessToken
  );
  const existing = (list.files || [])[0];
  if (existing?.id) return existing.id;

  // Create if not found
  const created = await gFetch<{ id: string }>(
    "https://www.googleapis.com/drive/v3/files",
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        name: spreadsheetName,
        mimeType: "application/vnd.google-apps.spreadsheet",
      }),
    }
  );
  return created.id;
}

/** Sheets: read a range */
export async function sheetsGet(
  accessToken: string,
  spreadsheetId: string,
  rangeA1: string
): Promise<{ values?: string[][] }> {
  return gFetch<{ values?: string[][] }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeA1)}`,
    accessToken
  );
}

/** Sheets: append rows to a sheet (creates rows; sheet/tab must exist) */
export async function sheetsAppend(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  values: Array<Array<string | number>>
): Promise<any> {
  return gFetch<any>(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      `${sheetName}!A1`
    )}:append?valueInputOption=RAW`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ values }),
    }
  );
}

/** Back-compat alias for older imports */
export { driveEnsureSpreadsheet as driveFindOrCreateSpreadsheet };

// --- GSC Top queries with position filter and country dimension ---
export async function gscTopQueries(
  accessToken: string,
  {
    siteUrl,
    startDate,
    endDate,
    country,       // "ALL" or ISO-3166-1 alpha-2
    rowLimit = 100,
    maxPosition = 10,
  }: { siteUrl: string; startDate: string; endDate: string; country: string; rowLimit?: number; maxPosition?: number; }
) {
  const dims: string[] = ["query"];
  const filters: any[] = [];
  if (country && country !== "ALL") {
    dims.push("country");
    filters.push({ dimension: "country", operator: "equals", expression: country.toLowerCase() });
  }

  const body: any = {
    startDate, endDate,
    dimensions: dims,
    rowLimit: Math.min(rowLimit, 25000),
    type: "web"
  };
  if (filters.length) body.dimensionFilter = { groupType: "and", filters };

  const data = await gscQuery(accessToken, siteUrl, body);
  // Filter by avg position <= maxPosition
  const rows = (data.rows || []).filter((r: any) => (r.position ?? r.avgPosition ?? 999) <= maxPosition);
  return { rows };
}

// --- GBP monthly keywords (past 3 months) ---
export async function gbpKeywordsLast3M(accessToken: string, locationName: string) {
  // My Business Performance API
  // https://businessprofileperformance.googleapis.com/v1/locations/*/searchkeywords/impressions/monthly
  const since = new Date(); since.setMonth(since.getMonth() - 3);
  const url = `https://businessprofileperformance.googleapis.com/v1/${encodeURIComponent(locationName)}/searchkeywords/impressions/monthly?monthly_range.start_month.year=${since.getFullYear()}&monthly_range.start_month.month=${since.getMonth()+1}&monthly_range.end_month.year=${new Date().getFullYear()}&monthly_range.end_month.month=${new Date().getMonth()+1}`;
  return gFetch<any>(url, accessToken);
}

