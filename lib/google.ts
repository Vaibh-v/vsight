// lib/google.ts

type GFetchInit = RequestInit & { headers?: Record<string, string> };

// Core Google fetch with helpful error messages
async function gFetch<T>(url: string, accessToken: string, init: GFetchInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const text = await res.text();

  // If Google returned an HTML consent/error page instead of JSON
  if (text.trim().startsWith("<")) {
    throw new Error(
      `Non-JSON response from Google. Check API enablement/scopes. First bytes: ${text.slice(0, 120)}…`
    );
  }

  if (!res.ok) {
    // Try to surface Google’s JSON error if present
    try {
      const j = JSON.parse(text);
      const msg = j.error?.message || j.error?.status || j.message || text;
      throw new Error(`${res.status} ${res.statusText}: ${msg}`);
    } catch {
      throw new Error(`${res.status} ${res.statusText}: ${text}`);
    }
  }

  return text ? (JSON.parse(text) as T) : ({} as T);
}

/* =========================
   GA4 (Admin + Data API)
   ========================= */

/** GA4: list properties via Admin API */
export async function gaListProperties(accessToken: string) {
  // v1alpha works; v1 can also be used if enabled on your project
  const data = await gFetch<{ accountSummaries?: any[] }>(
    "https://analyticsadmin.googleapis.com/v1alpha/accountSummaries?pagesize=200",
    accessToken
  );
  const out: { id: string; displayName: string }[] = [];
  for (const acc of data.accountSummaries || []) {
    for (const p of acc.propertySummaries || []) {
      out.push({
        id: String(p.property).split("/")[1],
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
   Search Console (Webmasters v3)
   ========================= */

/** GSC: list sites (filters out unverified) */
export async function gscSites(accessToken: string) {
  const data = await gFetch<{ siteEntry?: { siteUrl: string; permissionLevel: string }[] }>(
    "https://www.googleapis.com/webmasters/v3/sites",
    accessToken
  );
  return (data.siteEntry || []).filter((s) => s.permissionLevel !== "siteUnverifiedUser");
}

/** GSC: generic query */
export async function gscQuery(accessToken: string, siteUrl: string, body: any) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;
  return gFetch<any>(url, accessToken, { method: "POST", body: JSON.stringify(body) });
}

/** GSC: clicks time-series (by date) */
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

/** GBP: list locations (Account Mgmt + Business Information APIs) */
export async function gbpListLocations(accessToken: string) {
  // 1) Accounts
  const accounts = await gFetch<{ accounts?: { name: string }[] }>(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    accessToken
  );
  const out: { name: string; title: string }[] = [];
  for (const acc of accounts.accounts || []) {
    // 2) Locations under each account
    const locs = await gFetch<{ locations?: { name: string; title: string }[] }>(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title`,
      accessToken
    );
    for (const l of (locs.locations || [])) {
      out.push({ name: l.name, title: l.title });
    }
  }
  return out;
}

/* =========================
   Google Drive + Sheets (for simple key/value Settings)
   ========================= */

/** Drive: find or create a spreadsheet named `name` in the user's Drive. Returns spreadsheetId. */
export async function driveFindOrCreateSpreadsheet(accessToken: string, name: string) {
  // Search files with matching name & type
  const q = encodeURIComponent(`name='${name}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`);
  const search = await gFetch<{ files?: { id: string; name: string }[] }>(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`,
    accessToken
  );
  if (search.files && search.files.length) return search.files[0].id;

  // Create if not found
  const created = await gFetch<{ spreadsheetId: string }>(
    "https://sheets.googleapis.com/v4/spreadsheets",
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        properties: { title: name },
        sheets: [{ properties: { title: "Settings" } }],
      }),
    }
  );
  return created.spreadsheetId;
}

/** Sheets: read a range from a spreadsheet */
export async function sheetsGet(
  accessToken: string,
  spreadsheetId: string,
  rangeA1: string
) {
  return gFetch<{ values?: string[][] }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeA1)}`,
    accessToken
  );
}

/** Sheets: append rows to a tab */
export async function sheetsAppend(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  values: any[][]
) {
  // Ensure tab exists (best-effort; ignore errors)
  try {
    await gFetch<any>(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: { title: sheetName },
              },
            },
          ],
          includeSpreadsheetInResponse: false,
        }),
      }
    );
  } catch {
    // likely already exists
  }

  // Append values
  return gFetch<any>(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      `${sheetName}!A:Z`
    )}:append?valueInputOption=USER_ENTERED`,
    accessToken,
    { method: "POST", body: JSON.stringify({ values }) }
  );
}
