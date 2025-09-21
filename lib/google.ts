import type { NextApiRequest } from "next";
import { getToken } from "next-auth/jwt";
// --- ADD BELOW to lib/google.ts ---

import type { NextApiRequest } from "next";
import { google } from "googleapis";
import { getToken } from "next-auth/jwt";

/** Reuse a single helper to build an OAuth2 client using the user's NextAuth token. */
async function getGoogleClient(req: NextApiRequest) {
  const token = await getToken({ req });
  const accessToken = (token?.accessToken || token?.access_token) as string | undefined;
  if (!accessToken) {
    throw new Error("No Google access token found. Sign in with Google again.");
  }
  // Use OAuth2Client without clientId/secret for token-forwarding
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

/**
 * Find a spreadsheet by exact name, create if missing, and return its ID.
 * Requires Drive scope (drive.file or drive).
 */
export async function driveFindOrCreateSpreadsheet(req: NextApiRequest, name: string): Promise<string> {
  const auth = await getGoogleClient(req);
  const drive = google.drive({ version: "v3", auth });

  // Try to find by name (not guaranteed unique, we take the first)
  const list = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.spreadsheet' and name='${name.replace(/'/g, "\\'")}' and trashed=false`,
    fields: "files(id,name)",
    pageSize: 1,
    spaces: "drive",
  });

  const existing = list.data.files?.[0];
  if (existing?.id) return existing.id;

  // Create a new spreadsheet file
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.spreadsheet",
    },
    fields: "id",
  });

  const spreadsheetId = created.data.id;
  if (!spreadsheetId) throw new Error("Failed to create spreadsheet");
  return spreadsheetId;
}

/**
 * Read values from a spreadsheet range.
 * Requires Sheets scope (spreadsheets.readonly or spreadsheets).
 */
export async function sheetsGet(
  req: NextApiRequest,
  spreadsheetId: string,
  range: string
): Promise<any[][]> {
  const auth = await getGoogleClient(req);
  const sheets = google.sheets({ version: "v4", auth });
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  return (resp.data.values as any[][]) || [];
}

/** ---------- Shared helpers ---------- */

export async function getAccessToken(req: NextApiRequest): Promise<string> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const access = (token as any)?.access_token as string | undefined;
  if (!access) throw new Error("No Google access token");
  return access;
}

export async function forwardJsonOrText(r: Response) {
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error?.message || JSON.stringify(j));
    return j;
  }
  const t = await r.text();
  if (!r.ok) throw new Error(t || r.statusText);
  try { return JSON.parse(t); } catch { return t; }
}

/** ---------- GA4 ---------- */

export async function gaListProperties(arg: NextApiRequest | string) {
  const accessToken = typeof arg === "string" ? arg : await getAccessToken(arg);
  const url = "https://analyticsadmin.googleapis.com/v1alpha/accountSummaries";
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await forwardJsonOrText(r);
  const summaries = data?.accountSummaries || [];
  const props: Array<{ name: string; propertyId: string; displayName?: string }> = [];
  for (const s of summaries) {
    const children = s?.propertySummaries || [];
    for (const p of children) props.push({ name: p?.property, propertyId: p?.property?.split("/").pop() || "", displayName: p?.displayName });
  }
  return props.filter(p => p.propertyId);
}

export async function gaRunReport(token: string, propertyId: string, body: Record<string, any>) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return forwardJsonOrText(r);
}

/** ---------- GSC: flexible arg parsing to satisfy both old & new call sites ---------- */

type SortBy = "clicks" | "impressions" | "ctr" | "position";
type SortDir = "asc" | "desc";
type TopQueryOpts = { rowLimit?: number; sortBy?: SortBy; sortDir?: SortDir };

export async function gscSites(arg: NextApiRequest | string) {
  const accessToken = typeof arg === "string" ? arg : await getAccessToken(arg);
  const url = "https://www.googleapis.com/webmasters/v3/sites";
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await forwardJsonOrText(r);
  const items = data?.siteEntry || data?.items || [];
  const sites = items.map((s: any) => ({ siteUrl: s?.siteUrl || s?.url, permissionLevel: s?.permissionLevel, type: s?.type })).filter((x: any) => x?.siteUrl);
  return { sites, raw: data };
}

/**
 * Accepts either:
 *  - (req, siteUrl, start, end)
 *  - ({ req, siteUrl, start, end })
 */
export async function gscTimeseries(...args: any[]) {
  let req: NextApiRequest, siteUrl: string, start: string, end: string;
  if (args.length === 1 && typeof args[0] === "object" && "req" in args[0]) {
    ({ req, siteUrl, start, end } = args[0]);
  } else {
    [req, siteUrl, start, end] = args;
  }
  const accessToken = await getAccessToken(req);
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const body = {
    startDate: start,
    endDate: end,
    dimensions: ["date"],
    rowLimit: 25000
  };
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await forwardJsonOrText(r);
  const rows = (data?.rows || []).map((row: any) => ({
    date: row?.keys?.[0],
    clicks: row?.clicks || 0,
    impressions: row?.impressions || 0,
    ctr: row?.ctr || 0,
    position: row?.position || 0
  }));
  return { rows };
}

/**
 * Accepts either:
 *  - (req, siteUrl, start, end, opts?)
 *  - ({ req, siteUrl, start, end, rowLimit?, sortBy?, sortDir? })
 */
export async function gscTopQueries(...args: any[]) {
  let req: NextApiRequest, siteUrl: string, start: string, end: string, opts: TopQueryOpts = {};
  if (args.length === 1 && typeof args[0] === "object" && "req" in args[0]) {
    ({ req, siteUrl, start, end, ...opts } = args[0]);
  } else {
    [req, siteUrl, start, end, opts] = args;
  }
  const accessToken = await getAccessToken(req);
  const rowLimit = Number(opts?.rowLimit || 25);
  const dimensionFilterGroups: any[] = []; // future use
  const orderBy = opts?.sortBy
    ? [{ dimension: opts.sortBy, sortOrder: (opts?.sortDir || "desc").toUpperCase() }]
    : [{ dimension: "clicks", sortOrder: "DESCENDING" }];

  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const body = {
    startDate: start,
    endDate: end,
    dimensions: ["query"],
    rowLimit,
    orderBy,
    dimensionFilterGroups
  };
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await forwardJsonOrText(r);
  const rows = (data?.rows || []).map((row: any) => ({
    query: row?.keys?.[0] || "",
    clicks: row?.clicks || 0,
    impressions: row?.impressions || 0,
    ctr: row?.ctr || 0,
    position: row?.position || 0
  }));
  return { rows };
}
