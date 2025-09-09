// lib/google.ts

// Small helper for authenticated calls to Google APIs
async function gFetch<T>(
  url: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Google API ${res.status} ${res.statusText} for ${url} :: ${text}`
    );
  }
  return (await res.json()) as T;
}

/**
 * GA4 — list properties the user can access (flattened from account summaries)
 * Needs scope: https://www.googleapis.com/auth/analytics.readonly
 */
export async function gaListProperties(
  accessToken: string
): Promise<{ propertyId: string; displayName: string }[]> {
  type Summaries = {
    accountSummaries?: Array<{
      propertySummaries?: Array<{ property?: string; displayName?: string }>;
    }>;
  };
  const data = await gFetch<Summaries>(
    "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
    accessToken
  );
  const out: { propertyId: string; displayName: string }[] = [];
  for (const acct of data.accountSummaries || []) {
    for (const p of acct.propertySummaries || []) {
      if (p.property) {
        const id = p.property.replace("properties/", "");
        out.push({ propertyId: id, displayName: p.displayName || id });
      }
    }
  }
  return out;
}

/**
 * GA4 — runReport
 * POST https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runReport
 * Body is the standard RunReportRequest.
 * Needs scope: https://www.googleapis.com/auth/analytics.readonly
 */
export async function gaRunReport<T = any>(
  accessToken: string,
  propertyId: string,
  body: any
): Promise<T> {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(
    propertyId
  )}:runReport`;
  return gFetch<T>(url, accessToken, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * GSC — Search Analytics Query
 * POST https://searchconsole.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query
 * Needs scope: https://www.googleapis.com/auth/webmasters.readonly
 */
export async function gscQuery<T = any>(
  accessToken: string,
  siteUrl: string,
  body: {
    startDate: string;
    endDate: string;
    dimensions?: string[];
    rowLimit?: number;
    type?: "web" | "image" | "video" | "news" | "discover" | "googleNews";
    dimensionFilterGroups?: any[];
    aggregationType?: string;
    searchType?: string; // alias used by some samples; not required
    country?: string; // we let caller pass a dimension filter for country if needed
  }
): Promise<T> {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;
  return gFetch<T>(url, accessToken, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * GBP — list locations
 * GET https://mybusinessbusinessinformation.googleapis.com/v1/accounts/-/locations?pageSize=100
 * Needs scope: https://www.googleapis.com/auth/business.manage
 */
export async function gbpListLocations<T = any>(
  accessToken: string
): Promise<T> {
  const url =
    "https://mybusinessbusinessinformation.googleapis.com/v1/accounts/-/locations?pageSize=100";
  return gFetch<T>(url, accessToken);
}

/**
 * GBP — daily metrics (website clicks, phone calls, etc.)
 * POST https://businessprofileperformance.googleapis.com/v1/{locationName}/dailyMetrics:search
 * Body example:
 * {
 *   "dailyMetricAggregations": ["AGGREGATED_DAILY_METRICS"],
 *   "metricDimentions": ["BUSINESS_INTERACTIONS_WEBSITE_CLICKS"],
 *   "timeRange": {"startTime": "2024-06-01T00:00:00Z", "endTime": "2024-06-30T00:00:00Z"}
 * }
 * Needs scope: https://www.googleapis.com/auth/business.manage
 */
export async function gbpDailyMetrics<T = any>(
  accessToken: string,
  locationName: string, // e.g. "locations/12345678901234567890"
  opts: {
    metrics: string[]; // e.g. ["BUSINESS_INTERACTIONS_WEBSITE_CLICKS","BUSINESS_INTERACTIONS_PHONE_CLICKS"]
    startDate: string; // "YYYY-MM-DD"
    endDate: string; // "YYYY-MM-DD"
  }
): Promise<T> {
  const url = `https://businessprofileperformance.googleapis.com/v1/${encodeURIComponent(
    locationName
  )}/dailyMetrics:search`;

  // Build a simple time range at midnight UTC
  const startTime = `${opts.startDate}T00:00:00Z`;
  const endTime = `${opts.endDate}T00:00:00Z`;

  const body = {
    dailyMetricAggregations: ["AGGREGATED_DAILY_METRICS"],
    metricDimentions: opts.metrics, // (note GBP uses this misspelling in some docs; API accepts both)
    timeRange: { startTime, endTime },
  };

  return gFetch<T>(url, accessToken, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
