// lib/google.ts

// ---- GA4: Analytics Data API /properties/{id}:runReport ----
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

// ---- GSC: Search Analytics query ----
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
