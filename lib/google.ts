// lib/google.ts
// Unified Google helpers used by API routes. All imports should be:  import { ... } from "@/lib/google";

type HeadersInit_ = Record<string, string>;
const jget = async (url: string, token: string) => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } as HeadersInit_ });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
};
const jpost = async (url: string, token: string, body: any) => {
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    } as HeadersInit_,
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
};

// ---------------- GA4 ----------------

export async function gaListProperties(accessToken: string) {
  // 1) List accounts
  let accounts: any[] = [];
  try {
    const a = await jget("https://analyticsadmin.googleapis.com/v1beta/accounts", accessToken);
    accounts = a.accounts || [];
  } catch {
    // If user lacks admin scope, try properties directly via search (best-effort)
  }

  const allProps: any[] = [];
  // 2) For each account, list properties
  for (const acc of accounts) {
    try {
      const p = await jget(
        `https://analyticsadmin.googleapis.com/v1beta/properties?filter=parent:${encodeURIComponent(
          acc.name
        )}`,
        accessToken
      );
      (p.properties || []).forEach((prop: any) => {
        allProps.push({
          id: prop.name?.split("/")[1],
          displayName: prop.displayName,
          propertyId: prop.name?.split("/")[1],
        });
      });
    } catch {
      // ignore per-account errors
    }
  }

  // If none found, try the data API to detect a property provided by env or user later. Still return array.
  return { properties: allProps };
}

export async function gaRunReport(
  accessToken: string,
  propertyId: string,
  body: {
    dimensions?: Array<{ name: string }>;
    metrics?: Array<{ name: string }>;
    dateRanges: Array<{ startDate: string; endDate: string }>;
    dimensionFilter?: any;
    metricFilter?: any;
    limit?: string | number;
  }
) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(
    propertyId
  )}:runReport`;
  const json = await jpost(url, accessToken, body);
  // Normalize rows
  const rows =
    (json.rows || []).map((r: any) => ({
      dimensionValues: r.dimensionValues,
      metricValues: r.metricValues,
    })) || [];
  return { rows };
}

// ---------------- GSC ----------------

export async function gscSites(accessToken: string) {
  // Webmasters API
  const json = await jget("https://www.googleapis.com/webmasters/v3/sites/list", accessToken);
  const sites = (json.siteEntry || []).map((s: any) => ({
    siteUrl: s.siteUrl,
    permissionLevel: s.permissionLevel,
  }));
  return { sites };
}

export async function gscListSites(accessToken: string) {
  // alias for earlier code references
  return gscSites(accessToken);
}

export async function gscQuery(
  accessToken: string,
  siteUrl: string,
  body: {
    startDate: string;
    endDate: string;
    dimensions?: string[];
    rowLimit?: number;
    type?: "web" | "image" | "video" | "news" | "discover";
    dimensionFilterGroups?: any[];
    aggregationType?: "auto" | "byPage" | "byProperty";
    searchType?: string; // ignore, kept for compatibility
  }
) {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;
  const payload: any = {
    startDate: body.startDate,
    endDate: body.endDate,
    dimensions: body.dimensions || [],
    rowLimit: body.rowLimit || 25000,
    // API uses "searchType" in old docs; modern clients still accept "type"
    type: body.type || "web",
  };
  if (body.dimensionFilterGroups) payload.dimensionFilterGroups = body.dimensionFilterGroups;
  if (body.aggregationType) payload.aggregationType = body.aggregationType;
  const json = await jpost(url, accessToken, payload);
  return json; // returns { rows: [{keys:[], clicks, impressions, ctr, position}], ...}
}

export async function gscTimeseriesClicks(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string
) {
  const json = await gscQuery(accessToken, siteUrl, {
    startDate,
    endDate,
    dimensions: ["date"],
    rowLimit: 25000,
    type: "web",
  });
  const data =
    (json.rows || []).map((r: any) => ({
      date: r.keys?.[0],
      clicks: r.clicks || 0,
      ctr: r.ctr || 0,
    })) || [];
  return { data };
}

// ---------------- GBP (Business Profile) ----------------
// We’ll try Business Information API first (v1). If that fails, return empty array.

export async function gbpListLocations(accessToken: string) {
  // Attempt simple list with readMask to get minimal fields.
  // If the API requires accounts scoping, this may 403; we catch and return [].
  try {
    const url =
      "https://mybusinessbusinessinformation.googleapis.com/v1/locations?readMask=name,title,storeCode";
    const json = await jget(url, accessToken);
    const arr = json.locations || json.results || json || [];
    const locations = (arr || []).map((l: any) => ({
      name: l.name || l.locationName || "",
      title: l.title || l.storeCode || l.locationName || "",
    }));
    return locations;
  } catch {
    return [];
  }
}

// ---------------- Google Drive / Sheets ----------------

export async function driveFindOrCreateSpreadsheet(accessToken: string, name: string) {
  // 1) Try to find
  const listUrl =
    "https://www.googleapis.com/drive/v3/files?q=" +
    encodeURIComponent(`name='${name}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`) +
    "&fields=files(id,name)";
  try {
    const found = await jget(listUrl, accessToken);
    const file = (found.files || [])[0];
    if (file?.id) return file.id;
  } catch {
    // ignore
  }
  // 2) Create
  const createUrl = "https://sheets.googleapis.com/v4/spreadsheets";
  const created = await jpost(createUrl, accessToken, { properties: { title: name } });
  return created.spreadsheetId;
}

export async function sheetsGet(accessToken: string, spreadsheetId: string, range: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(range)}`;
  try {
    return await jget(url, accessToken);
  } catch {
    return { values: [] };
  }
}

export async function sheetsAppend(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  values: any[][]
) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`;
  await jpost(url, accessToken, { values });
}
