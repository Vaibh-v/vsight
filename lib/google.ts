// lib/google.ts
import type { NextApiRequest } from "next";
import { google } from "googleapis";
import { getToken } from "next-auth/jwt";

/** Small helper for fetch->JSON or text passthrough */
export async function forwardJsonOrText(r: Response) {
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("application/json")) return r.json();
  const t = await r.text();
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}

/** Return a Google OAuth access token extracted from NextAuth JWT */
export async function getAccessToken(req: NextApiRequest): Promise<string> {
  const token = await getToken({ req });
  const access =
    (token?.accessToken as string | undefined) ||
    (token?.access_token as string | undefined);
  if (!access) throw new Error("No Google access token found. Sign in again.");
  return access;
}

/** Build an OAuth2 client using the current user's access token */
async function getGoogleClient(req: NextApiRequest) {
  const accessToken = await getAccessToken(req);
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

/* =================================================================================
 * GA4 (Google Analytics Data API)
 * ================================================================================= */

/**
 * Run a GA4 report
 * Used like: gaRunReport(token, propertyId, body)
 */
export async function gaRunReport(
  accessToken: string,
  propertyId: string,
  body: Record<string, any>
) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(
    propertyId
  )}:runReport`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`GA4 runReport failed: ${r.status} ${txt}`);
  }
  return r.json();
}

/**
 * List GA4 properties the user can see.
 * Note: call with req (NOT with a token string): gaListProperties(req)
 */
export async function gaListProperties(req: NextApiRequest) {
  const accessToken = await getAccessToken(req);
  const url = "https://analyticsadmin.googleapis.com/v1alpha/accountSummaries";
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`GA4 list properties failed: ${r.status} ${txt}`);
  }
  const data: any = await forwardJsonOrText(r);
  // Flatten to a simple array of { propertyId, displayName, account }
  const out: Array<{ propertyId: string; displayName: string; account: string }> = [];
  (data?.accountSummaries || []).forEach((acc: any) => {
    (acc?.propertySummaries || []).forEach((p: any) => {
      out.push({
        propertyId: String(p?.property || "").replace("properties/", ""),
        displayName: String(p?.displayName || ""),
        account: String(acc?.name || ""),
      });
    });
  });
  return out;
}

/* =================================================================================
 * GSC (Search Console) – Timeseries & Top Queries
 * ================================================================================= */

type SortBy = "clicks" | "impressions" | "ctr" | "position";
type SortDir = "asc" | "desc";

function toGscDateRange(start: string, end: string) {
  return [{ startDate: start, endDate: end }];
}

async function gscQuery(
  req: NextApiRequest,
  siteUrl: string,
  requestBody: Record<string, any>
) {
  const accessToken = await getAccessToken(req);
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`GSC query failed: ${r.status} ${txt}`);
  }
  return r.json();
}

/**
 * Timeseries over date for a site.
 * Returns: { rows: Array<{ date: string; clicks: number; impressions: number; ctr: number; position: number }> }
 */
export async function gscTimeseries(
  req: NextApiRequest,
  siteUrl: string,
  start: string,
  end: string
): Promise<{ rows: Array<{ date: string; clicks: number; impressions: number; ctr: number; position: number }> }> {
  const data = await gscQuery(req, siteUrl, {
    startDate: start,
    endDate: end,
    dimensions: ["date"],
    rowLimit: 4000,
  });

  const rows =
    (data?.rows || []).map((r: any) => {
      const date = String(r?.keys?.[0] || "");
      const clicks = Number(r?.clicks ?? 0);
      const impressions = Number(r?.impressions ?? 0);
      const ctr = Number(r?.ctr ?? 0);
      const position = Number(r?.position ?? 0);
      return { date, clicks, impressions, ctr, position };
    }) || [];

  return { rows };
}

/**
 * Top queries, supports BOTH signatures:
 *   gscTopQueries(req, siteUrl, start, end, rowLimitNumber)
 *   gscTopQueries(req, siteUrl, start, end, { rowLimit, sortBy, sortDir })
 * Returns: { rows: Array<{ key: string; clicks: number; impressions: number; ctr: number; position: number }> }
 */
export async function gscTopQueries(
  req: NextApiRequest,
  siteUrl: string,
  start: string,
  end: string,
  fifth?: number | { rowLimit?: number; sortBy?: SortBy; sortDir?: SortDir }
): Promise<{ rows: Array<{ key: string; clicks: number; impressions: number; ctr: number; position: number }> }> {
  let rowLimit = 250;
  let sortBy: SortBy = "clicks";
  let sortDir: SortDir = "desc";

  if (typeof fifth === "number") {
    rowLimit = fifth;
  } else if (fifth && typeof fifth === "object") {
    if (typeof fifth.rowLimit === "number") rowLimit = fifth.rowLimit;
    if (fifth.sortBy) sortBy = fifth.sortBy;
    if (fifth.sortDir) sortDir = fifth.sortDir;
  }

  const order =
    sortBy === "ctr" || sortBy === "position"
      ? sortDir // API supports ascending for position if desired
      : sortDir;

  const data = await gscQuery(req, siteUrl, {
    startDate: start,
    endDate: end,
    dimensions: ["query"],
    rowLimit,
    orderBy: [{ field: sortBy, desc: sortDir === "desc" }],
  });

  const rows =
    (data?.rows || []).map((r: any) => {
      const key = String(r?.keys?.[0] || "");
      const clicks = Number(r?.clicks ?? 0);
      const impressions = Number(r?.impressions ?? 0);
      const ctr = Number(r?.ctr ?? 0);
      const position = Number(r?.position ?? 0);
      return { key, clicks, impressions, ctr, position };
    }) || [];

  // If API orderBy didn’t honor asc/desc as expected for some fields, enforce locally.
  rows.sort((a, b) => {
    const field = sortBy;
    const dir = sortDir === "desc" ? -1 : 1;
    return (a[field] < b[field] ? 1 : a[field] > b[field] ? -1 : 0) * dir * -1;
  });

  return { rows };
}

/* =================================================================================
 * Google Drive & Sheets (for Settings)
 * ================================================================================= */

/** Find a spreadsheet by exact name, create if missing, return its ID */
export async function driveFindOrCreateSpreadsheet(
  req: NextApiRequest,
  name: string
): Promise<string> {
  const auth = await getGoogleClient(req);
  const drive = google.drive({ version: "v3", auth });

  const list = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.spreadsheet' and name='${name.replace(/'/g, "\\'")}' and trashed=false`,
    fields: "files(id,name)",
    pageSize: 1,
    spaces: "drive",
  });

  const existing = list.data.files?.[0];
  if (existing?.id) return existing.id;

  const created = await drive.files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.spreadsheet" },
    fields: "id",
  });

  const spreadsheetId = created.data.id;
  if (!spreadsheetId) throw new Error("Failed to create spreadsheet");
  return spreadsheetId;
}

/** Read values from a spreadsheet range */
export async function sheetsGet(
  req: NextApiRequest,
  spreadsheetId: string,
  range: string
): Promise<any[][]> {
  const auth = await getGoogleClient(req);
  const sheets = google.sheets({ version: "v4", auth });
  const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return (resp.data.values as any[][]) || [];
}
