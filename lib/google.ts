// lib/google.ts

// --- GA4: RunReport (Analytics Data API) ---
export async function gaRunReport(
  accessToken: string,
  propertyId: string,
  body: {
    dimensions?: { name: string }[];
    metrics?: { name: string }[];
    dateRanges: { startDate: string; endDate: string }[];
    dimensionFilter?: any;
    metricFilter?: any;
    orderBys?: any[];
    limit?: string;
    keepEmptyRows?: boolean;
  }
) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GA4 RunReport ${res.status}: ${text}`);
  }
  return res.json();
}

// --- Google Search Console: searchAnalytics.query ---
export type GscQueryBody = {
  startDate: string;
  endDate: string;
  dimensions?: string[];
  rowLimit?: number;
  type?: "web" | "image" | "video" | "news" | "discover" | "googleNews";
  dimensionFilterGroups?: any[];
  aggregationType?: "auto" | "byProperty" | "byPage";
  startRow?: number;
  dataState?: "final" | "all";
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
    const text = await res.text();
    throw new Error(`GSC query ${res.status}: ${text}`);
  }
  return res.json();
}
