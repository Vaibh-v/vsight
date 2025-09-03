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
