// lib/google.ts

// Small fetch helper that throws helpful errors for non-JSON responses (e.g. consent pages)
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

  // If Google sends an HTML consent/error page, make the error obvious
  if (text.trim().startsWith("<")) {
    throw new Error(
      `Non-JSON response from Google. Likely missing API enablement or scopes. First bytes: ${text.slice(0, 120)}…`
    );
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text}`);

  return text ? (JSON.parse(text) as T) : ({} as T);
}

/** ---------- GA4 (Admin + Data APIs) ---------- **/

// List GA4 properties via Analytics Admin API
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

// Run a GA4 report via Analytics Data API
export async function gaRunReport(accessToken: string, propertyId: string, body: any) {
  return gFetch<any>(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    accessToken,
    { method: "POST", body: JSON.stringify(body) }
  );
}

/** ---------- GSC (Search Console / Webmasters v3) ---------- **/

// List Search Console sites (only verified / usable)
export async function gscSites(accessToken: string) {
  const data = await gFetch<{ siteEntry?: { siteUrl: string; permissionLevel: string }[] }>(
    "https://www.googleapis.com/webmasters/v3/sites",
    accessToken
  );
  return (data.siteEntry || []).filter((s) => s.permissionLevel !== "siteUnverifiedUser");
}

// Generic GSC search analytics query
export async function gscQuery(accessToken: string, siteUrl: string, body: any) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;
  return gFetch<any>(url, accessToken, { method: "POST", body: JSON.stringify(body) });
}

/** ---------- GBP (Business Profile) ---------- **/

// List GBP locations (needs Business Account Mgmt + Business Information APIs enabled and scope business.manage)
export async function gbpListLocations(accessToken: string) {
  // 1) accounts
  const accounts = await gFetch<{ accounts?: { name: string }[] }>(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    accessToken
  );
  const out: { name: string; title: string }[] = [];
  for (const acc of accounts.accounts || []) {
    // 2) locations under each account
    const locs = await gFetch<{ locations?: { name: string; title: string }[] }>(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title`,
      accessToken
    );
    for (const l of locs.locations || []) out.push({ name: l.name, title: l.title });
  }
  return out;
}
// --- Add this to lib/google.ts ---

/** GSC: clicks timeseries (optionally filter by country code, e.g. "USA", "IND", "GBR") */
export async function gscTimeseriesClicks(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
  country?: string
) {
  const body: any = {
    startDate,
    endDate,
    dimensions: ["date"],
    rowLimit: 25000,
    type: "web",
  };

  // If a country is provided, add a dimension filter
  if (country && country !== "ALL") {
    body.dimensionFilterGroups = [
      {
        groupType: "and",
        filters: [
          {
            dimension: "country",
            operator: "equals",
            expression: country,
          },
        ],
      },
    ];
  }

  return gscQuery(accessToken, siteUrl, body);
}
