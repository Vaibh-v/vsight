type GAReportRow = { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] };
type GAReport = { rows?: GAReportRow[] };

async function asJson<T = any>(r: Response): Promise<T> {
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status} ${r.statusText}${text ? ` - ${text}` : ""}`);
  }
  return r.json() as Promise<T>;
}

/* ---------------- GA4 ---------------- */

export async function gaListProperties(accessToken: string) {
  const url = "https://analyticsadmin.googleapis.com/v1beta/properties?pageSize=200";
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const j = await asJson<{ properties?: { name: string; displayName: string }[] }>(r);
  return (j.properties || []).map(p => ({
    id: (p.name || "").replace("properties/", ""),
    displayName: p.displayName || p.name || ""
  }));
}

export async function gaRunReport(
  accessToken: string,
  propertyId: string,
  body: any
): Promise<GAReport> {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return asJson<GAReport>(r);
}

/* ---------------- GSC ---------------- */

export async function gscSites(accessToken: string) {
  const r = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const j = await asJson<{ siteEntry?: { siteUrl: string }[] }>(r);
  return (j.siteEntry || []).map(s => ({ siteUrl: s.siteUrl }));
}

export async function gscQuery(
  accessToken: string,
  siteUrl: string,
  q: {
    startDate: string;
    endDate: string;
    dimensions?: string[];
    rowLimit?: number;
    type?: "web" | "image" | "video" | "discover" | "googleNews";
    dimensionFilterGroups?: any[];
  }
) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(q)
  });
  return asJson<{
    rows?: { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }[];
  }>(r);
}

export async function gscTimeseriesClicks(
  accessToken: string,
  siteUrl: string,
  start: string,
  end: string
) {
  const resp = await gscQuery(accessToken, siteUrl, {
    startDate: start,
    endDate: end,
    dimensions: ["date"],
    rowLimit: 25000,
    type: "web"
  });
  const data = (resp.rows || []).map(r => ({
    date: r.keys?.[0] || "",
    clicks: Number(r.clicks || 0),
    ctr: Number(r.ctr || 0)
  }));
  return { data };
}

/* ---------------- GBP ---------------- */

export async function gbpListLocations(accessToken: string) {
  const acc = await asJson<{ accounts?: { name: string }[] }>(
    await fetch("https://mybusinessbusinessinformation.googleapis.com/v1/accounts", {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
  );
  const accountName = acc.accounts?.[0]?.name; // "accounts/123..."
  if (!accountName) return [];

  const loc = await asJson<{ locations?: { name?: string; title?: string; storeCode?: string; locationName?: string }[] }>(
    await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storeCode,locationName&pageSize=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
  );
  return (loc.locations || []).map(l => ({
    name: l.name || "",
    title: l.title || l.storeCode || l.locationName || ""
  }));
}

/* ---------------- Sheets / Drive (Settings) ---------------- */

export async function driveEnsureSpreadsheet(accessToken: string, name: string) {
  const find = await asJson<{ files?: { id: string }[] }>(
    await fetch(
      "https://www.googleapis.com/drive/v3/files?q=" +
        encodeURIComponent(`name='${name}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`) +
        "&fields=files(id)",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
  );
  if (find.files?.[0]?.id) return find.files[0].id;

  const created = await asJson<{ id: string }>(
    await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ properties: { title: name } })
    })
  );
  return created.id;
}
export const driveFindOrCreateSpreadsheet = driveEnsureSpreadsheet; // alias (some old imports expect this)

export async function sheetsGet(accessToken: string, spreadsheetId: string, range: string) {
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return asJson<{ values?: string[][] }>(r);
}

export async function sheetsAppend(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  values: any[][]
) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    sheetName
  )}:append?valueInputOption=USER_ENTERED`;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values })
  });
  return asJson(r);
}
