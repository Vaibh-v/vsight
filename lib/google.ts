// lib/google.ts

// ---------- GA4: Analytics Data API (runReport) ----------
export type GaRunReportRequest = {
  dimensions?: { name: string }[];
  metrics?: { name: string }[];
  dateRanges: { startDate: string; endDate: string }[];
  dimensionFilter?: any;
  metricFilter?: any;
  orderBys?: any[];
  limit?: string;
};

export async function gaRunReport(
  accessToken: string,
  propertyId: string,
  body: GaRunReportRequest
) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(
    propertyId
  )}:runReport`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GA4 runReport failed ${res.status}: ${txt}`);
  }
  return res.json();
}

// ---------- GA Admin API: list properties visible to the user ----------
export type GaPropertySummary = { property: string; displayName: string };

export async function gaListProperties(accessToken: string): Promise<GaPropertySummary[]> {
  // Account summaries give us properties across all accounts in one call
  const url = "https://analyticsadmin.googleapis.com/v1beta/accountSummaries";

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GA Admin list properties failed ${res.status}: ${txt}`);
  }

  const json = await res.json();
  // Flatten propertySummaries from each accountSummary
  const out: GaPropertySummary[] = [];
  for (const acc of json.accountSummaries ?? []) {
    for (const p of acc.propertySummaries ?? []) {
      // property names are like "properties/123456789"
      out.push({ property: p.property, displayName: p.displayName });
    }
  }
  return out;
}

// ---------- GSC: Search Analytics query ----------
export type GscQueryBody = {
  startDate: string;
  endDate: string;
  dimensions?: string[];
  rowLimit?: number;
  type?: "web" | "image" | "video" | "news";
  dimensionFilterGroups?: any;
  aggregationType?: any;
  startRow?: number;
  dataState?: "all" | "final";
};

export async function gscQuery(
  accessToken: string,
  siteUrl: string,
  body: GscQueryBody
) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;

  const payload = {
    startDate: body.startDate,
    endDate: body.endDate,
    dimensions: body.dimensions ?? ["date"],
    rowLimit: body.rowLimit ?? 25000,
    type: body.type ?? "web",
    dimensionFilterGroups: body.dimensionFilterGroups,
    aggregationType: body.aggregationType,
    startRow: body.startRow,
    dataState: body.dataState,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GSC query ${res.status}: ${txt}`);
  }
  return res.json();
}

// ---------- GSC: list verified sites for the user ----------
export type GscSite = { siteUrl: string; permissionLevel?: string };

export async function gscListSites(accessToken: string): Promise<GscSite[]> {
  const url = "https://searchconsole.googleapis.com/webmasters/v3/sites/list";

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GSC list sites failed ${res.status}: ${txt}`);
  }

  const json = await res.json();
  // Response shape: { siteEntry: [{siteUrl, permissionLevel}, ...] }
  return (json.siteEntry ?? []) as GscSite[];
}
// ---------- GSC: time-series (date) clicks/impressions/ctr/position ----------
export async function gscTimeseriesClicks(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
  opts?: { country?: string; type?: "web" | "image" | "video" | "news" }
) {
  const dimensionFilterGroups =
    opts?.country
      ? [
          {
            groupType: "and",
            filters: [{ dimension: "country", operator: "equals", expression: opts.country }],
          },
        ]
      : undefined;

  const json = await gscQuery(accessToken, siteUrl, {
    startDate,
    endDate,
    dimensions: ["date"],
    rowLimit: 25000,
    type: opts?.type ?? "web",
    dimensionFilterGroups,
    dataState: "final",
  });

  // rows: [{ keys: ["2024-08-01"], clicks, impressions, ctr, position }, ...]
  const rows = (json.rows ?? []).map((r: any) => ({
    date: r.keys?.[0] ?? "",
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: r.ctr ?? 0,
    position: r.position ?? 0,
  }));

  return rows;
}

// ---------- GSC: top queries helper (useful for tracker & dashboard) ----------
export async function gscTopQueries(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
  opts?: {
    country?: string;
    type?: "web" | "image" | "video" | "news";
    rowLimit?: number;
  }
) {
  const dimensionFilterGroups =
    opts?.country
      ? [
          {
            groupType: "and",
            filters: [{ dimension: "country", operator: "equals", expression: opts.country }],
          },
        ]
      : undefined;

  const json = await gscQuery(accessToken, siteUrl, {
    startDate,
    endDate,
    dimensions: ["query"],
    rowLimit: opts?.rowLimit ?? 100,
    type: opts?.type ?? "web",
    dimensionFilterGroups,
    dataState: "final",
  });

  // rows: [{ keys: ["query text"], clicks, impressions, ctr, position }, ...]
  return (json.rows ?? []).map((r: any) => ({
    query: r.keys?.[0] ?? "",
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: r.ctr ?? 0,
    position: r.position ?? 0,
  }));
}
// ---------- Drive: find-or-create spreadsheet by name ----------
export async function driveFindOrCreateSpreadsheet(
  accessToken: string,
  name: string
): Promise<string> {
  // Search for an existing Google Sheet with this exact name
  const q = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
  const listUrl = `https://www.googleapis.com/drive/v3/files?${new URLSearchParams({
    q,
    fields: "files(id,name)",
    spaces: "drive",
    pageSize: "10",
  }).toString()}`;

  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listRes.ok) {
    const txt = await listRes.text();
    throw new Error(`Drive list failed ${listRes.status}: ${txt}`);
  }
  const listJson = await listRes.json();
  const found = (listJson.files ?? [])[0];
  if (found?.id) return found.id;

  // Create a new Google Sheet
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.spreadsheet",
    }),
  });
  if (!createRes.ok) {
    const txt = await createRes.text();
    throw new Error(`Drive create failed ${createRes.status}: ${txt}`);
  }
  const created = await createRes.json();
  if (!created.id) throw new Error("Drive create returned no id");
  return created.id;
}

// ---------- Sheets: read a range ----------
export async function sheetsGet(
  accessToken: string,
  spreadsheetId: string,
  rangeA1: string
): Promise<{ values?: any[][] }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(rangeA1)}?majorDimension=ROWS`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Sheets get failed ${res.status}: ${txt}`);
  }
  return res.json();
}
