// lib/google.ts
// Small, typed wrappers around Google APIs we use.
// All functions return "safe" shapes so the UI doesn't crash if an API call fails.

type GAProperty = { id: string; displayName: string };
type GASessionRow = { date: string; sessions: number };
type GSCSite = { siteUrl: string };
type GSCTimeRow = { date: string; clicks: number; impressions: number; ctr: number; position: number };
type GSCTopRow = { query: string; clicks: number; impressions: number; ctr: number; position: number };

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

// ---------- GA4 ----------
export async function gaListProperties(token: string): Promise<GAProperty[]> {
  try {
    const r = await fetch(
      "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
      { headers: authHeaders(token) }
    );
    if (!r.ok) throw new Error(await r.text());
    const j = await r.json();
    const props: GAProperty[] = [];
    for (const a of j.accountSummaries || []) {
      for (const p of a.propertySummaries || []) {
        props.push({ id: String(p.property || "").replace("properties/", ""), displayName: p.displayName || "" });
      }
    }
    return props;
  } catch {
    return [];
  }
}

export async function gaRunReport(
  token: string,
  propertyId: string,
  body: any
): Promise<GASessionRow[]> {
  try {
    const r = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      { method: "POST", headers: authHeaders(token), body: JSON.stringify(body) }
    );
    if (!r.ok) throw new Error(await r.text());
    const j = await r.json();
    const rows: GASessionRow[] = (j.rows || []).map((row: any) => ({
      date: row.dimensionValues?.[0]?.value || "",
      sessions: Number(row.metricValues?.[0]?.value || 0),
    }));
    return rows;
  } catch {
    return [];
  }
}

// ---------- GSC ----------
export async function gscSites(token: string): Promise<GSCSite[]> {
  try {
    const r = await fetch(
      "https://www.googleapis.com/webmasters/v3/sites",
      { headers: authHeaders(token) }
    );
    if (!r.ok) throw new Error(await r.text());
    const j = await r.json();
    return (j.siteEntry || [])
      .filter((s: any) => s.permissionLevel && s.siteUrl)
      .map((s: any) => ({ siteUrl: s.siteUrl }));
  } catch {
    return [];
  }
}

async function gscQueryRaw(
  token: string,
  siteUrl: string,
  body: any
): Promise<any> {
  const r = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    { method: "POST", headers: authHeaders(token), body: JSON.stringify(body) }
  );
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function gscTimeseriesClicks(
  token: string,
  siteUrl: string,
  start: string,
  end: string
): Promise<GSCTimeRow[]> {
  try {
    const j = await gscQueryRaw(token, siteUrl, {
      startDate: start,
      endDate: end,
      dimensions: ["date"],
      rowLimit: 5000,
      type: "web"
    });
    return (j.rows || []).map((row: any) => ({
      date: row.keys?.[0] || "",
      clicks: Number(row.clicks || 0),
      impressions: Number(row.impressions || 0),
      ctr: Number(row.ctr || 0),
      position: Number(row.position || 0),
    }));
  } catch {
    return [];
  }
}

export async function gscTop10(
  token: string,
  siteUrl: string,
  start: string,
  end: string
): Promise<GSCTopRow[]> {
  try {
    const j = await gscQueryRaw(token, siteUrl, {
      startDate: start,
      endDate: end,
      dimensions: ["query"],
      rowLimit: 10,
      type: "web"
    });
    return (j.rows || []).map((row: any) => ({
      query: row.keys?.[0] || "",
      clicks: Number(row.clicks || 0),
      impressions: Number(row.impressions || 0),
      ctr: Number(row.ctr || 0),
      position: Number(row.position || 0),
    }));
  } catch {
    return [];
  }
}
