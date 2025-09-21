// lib/google.ts

import type { NextApiRequest } from "next";
import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { getToken } from "next-auth/jwt";

/* -------------------------------------------------------------------------------------------------
 * Utilities
 * -----------------------------------------------------------------------------------------------*/

/** Try to parse JSON; if not JSON, return text */
export async function forwardJsonOrText(r: Response) {
  const ctype = r.headers.get("content-type") || "";
  const text = await r.text();
  if (ctype.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }
  return { raw: text };
}

/** Create an OAuth2 client from a raw access token string */
export function authFromAccessToken(token: string): OAuth2Client {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });
  return auth as unknown as OAuth2Client;
}

/** Extract Google access token from a Next.js API request via next-auth */
export async function getGoogleAuthFromReq(req: NextApiRequest): Promise<OAuth2Client> {
  // next-auth/jwt returns the JWT the session stored; many providers place the
  // raw google access token under `accessToken` or `access_token`.
  const jwt = await getToken({ req, decode: undefined });
  const token =
    (jwt as any)?.accessToken ||
    (jwt as any)?.access_token ||
    (jwt as any)?.access_token?.toString?.();

  if (!token) {
    throw new Error("No Google access token on request (next-auth).");
  }
  return authFromAccessToken(String(token));
}

/* -------------------------------------------------------------------------------------------------
 * Google Analytics 4 (Admin + Data)
 * -----------------------------------------------------------------------------------------------*/

/**
 * List GA4 properties visible to the user.
 * Accepts either a raw `accessToken` string OR a NextApiRequest.
 */
export async function gaListProperties(tokenOrReq: string | NextApiRequest) {
  let bearer = "";
  if (typeof tokenOrReq === "string") {
    bearer = tokenOrReq;
  } else {
    const auth = await getGoogleAuthFromReq(tokenOrReq);
    const creds = await auth.getAccessToken();
    bearer = String(creds?.token || "");
  }
  if (!bearer) throw new Error("gaListProperties: missing access token");

  // Analytics Admin: list account summaries to discover properties
  const url = "https://analyticsadmin.googleapis.com/v1alpha/accountSummaries";
  const r = await fetch(url, { headers: { Authorization: `Bearer ${bearer}` } });
  const data = await forwardJsonOrText(r);

  const summaries: any[] = data?.accountSummaries || [];
  // Flatten into { propertyId, displayName, account, propertyName }
  const out: Array<{ propertyId: string; displayName: string; account: string; propertyName: string }> = [];
  for (const s of summaries) {
    const account = s?.name ?? "";
    const props: any[] = s?.propertySummaries || [];
    for (const p of props) {
      out.push({
        propertyId: String(p?.property ?? "").replace(/^properties\//, ""),
        displayName: String(p?.displayName ?? ""),
        account,
        propertyName: String(p?.property ?? ""),
      });
    }
  }
  return out;
}

/**
 * GA4 runReport — flexible, accepts:
 *  - (token: string, propertyId: string, body: object)
 *  - (req: NextApiRequest, propertyId: string, body: object)
 */
export async function gaRunReport(
  tokenOrReq: string | NextApiRequest,
  propertyId: string,
  body: Record<string, any>
) {
  let bearer = "";
  if (typeof tokenOrReq === "string") {
    bearer = tokenOrReq;
  } else {
    const auth = await getGoogleAuthFromReq(tokenOrReq);
    const creds = await auth.getAccessToken();
    bearer = String(creds?.token || "");
  }
  if (!bearer) throw new Error("gaRunReport: missing access token");

  const pid = String(propertyId).replace(/^properties\//, "");
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${pid}:runReport`;

  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body || {}),
  });

  return forwardJsonOrText(r);
}

/* -------------------------------------------------------------------------------------------------
 * Google Search Console
 * -----------------------------------------------------------------------------------------------*/

export type GscSortBy = "clicks" | "impressions" | "ctr" | "position";
export type GscSortDir = "asc" | "desc";
export interface GscTopQueryOptions {
  rowLimit?: number;
  sortBy?: GscSortBy;
  sortDir?: GscSortDir;
}

/**
 * Timeseries: clicks, impressions, ctr, position — by DATE
 * Signature: gscTimeseries(req, siteUrl, start, end)
 */
export async function gscTimeseries(
  req: NextApiRequest,
  siteUrl: string,
  start: string,
  end: string
): Promise<{
  rows: Array<{ date: string; clicks: number; impressions: number; ctr: number; position: number }>;
}> {
  const auth = await getGoogleAuthFromReq(req);
  const searchconsole = google.searchconsole({ version: "v1", auth });

  const requestBody: any = {
    startDate: start,
    endDate: end,
    dimensions: ["DATE"],
    rowLimit: 5000,
  };

  const r = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody,
  });

  const rows =
    r.data.rows?.map((row: any) => ({
      date: row.keys?.[0] ?? "",
      clicks: Number(row.clicks ?? 0),
      impressions: Number(row.impressions ?? 0),
      ctr: Number(row.ctr ?? 0),
      position: Number(row.position ?? 0),
    })) ?? [];

  return { rows };
}

/**
 * Top queries — backward compatible + modern call styles.
 *
 * Overloads:
 * 1) gscTopQueries(req, siteUrl, start, end)
 * 2) gscTopQueries(req, siteUrl, start, end, rowLimit)
 * 3) gscTopQueries(req, siteUrl, start, end, rowLimit, sortBy, sortDir)
 * 4) gscTopQueries(req, siteUrl, start, end, { rowLimit, sortBy, sortDir })
 */
export function gscTopQueries(
  req: NextApiRequest,
  siteUrl: string,
  start: string,
  end: string
): Promise<{ rows: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }> }>;
export function gscTopQueries(
  req: NextApiRequest,
  siteUrl: string,
  start: string,
  end: string,
  rowLimit: number
): Promise<{ rows: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }> }>;
export function gscTopQueries(
  req: NextApiRequest,
  siteUrl: string,
  start: string,
  end: string,
  rowLimit: number,
  sortBy: GscSortBy,
  sortDir: GscSortDir
): Promise<{ rows: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }> }>;
export function gscTopQueries(
  req: NextApiRequest,
  siteUrl: string,
  start: string,
  end: string,
  opts: GscTopQueryOptions
): Promise<{ rows: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }> }>;
export async function gscTopQueries(
  req: NextApiRequest,
  siteUrl: string,
  start: string,
  end: string,
  arg5?: number | GscTopQueryOptions,
  arg6?: GscSortBy,
  arg7?: GscSortDir
): Promise<{ rows: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }> }> {
  let rowLimit = 25;
  let sortBy: GscSortBy = "clicks";
  let sortDir: GscSortDir = "desc";

  if (typeof arg5 === "object" && arg5 !== null) {
    rowLimit = arg5.rowLimit ?? rowLimit;
    sortBy = arg5.sortBy ?? sortBy;
    sortDir = arg5.sortDir ?? sortDir;
  } else if (typeof arg5 === "number") {
    rowLimit = arg5;
    if (arg6) sortBy = arg6;
    if (arg7) sortDir = arg7;
  }

  const auth = await getGoogleAuthFromReq(req);
  const searchconsole = google.searchconsole({ version: "v1", auth });

  // Search Console sorting: fieldName + sortOrder (ASCENDING/DESCENDING)
  const orderBy = [
    {
      fieldName: sortBy, // "clicks" | "impressions" | "ctr" | "position"
      sortOrder: sortDir === "asc" ? "ASCENDING" : "DESCENDING",
    },
  ];

  const requestBody: any = {
    startDate: start,
    endDate: end,
    dimensions: ["QUERY"],
    rowLimit,
    orderBy,
  };

  const r = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody,
  });

  const rows =
    r.data.rows?.map((row: any) => ({
      query: row.keys?.[0] ?? "",
      clicks: Number(row.clicks ?? 0),
      impressions: Number(row.impressions ?? 0),
      ctr: Number(row.ctr ?? 0),
      position: Number(row.position ?? 0),
    })) ?? [];

  return { rows };
}

/* -------------------------------------------------------------------------------------------------
 * (Optional) Drive/Sheets helpers — included because earlier builds referenced them.
 * These are minimal; expand as needed.
 * -----------------------------------------------------------------------------------------------*/

export async function driveFindOrCreateSpreadsheet(
  reqOrToken: NextApiRequest | string,
  title: string = "Vsight Data",
  folderId?: string
): Promise<{ id: string; url: string }> {
  const auth =
    typeof reqOrToken === "string" ? authFromAccessToken(reqOrToken) : await getGoogleAuthFromReq(reqOrToken);

  const drive = google.drive({ version: "v3", auth });

  // Try to find existing by name (basic search)
  const q = [`mimeType='application/vnd.google-apps.spreadsheet'`, `name='${title.replace(/'/g, "\\'")}'`];
  if (folderId) q.push(`'${folderId}' in parents`);
  const list = await drive.files.list({ q: q.join(" and "), fields: "files(id, name, webViewLink)" });
  const existing = list.data.files?.[0];
  if (existing?.id) {
    return { id: existing.id, url: existing.webViewLink || `https://docs.google.com/spreadsheets/d/${existing.id}` };
  }

  // Create new spreadsheet via Drive
  const create = await drive.files.create({
    requestBody: {
      name: title,
      parents: folderId ? [folderId] : undefined,
      mimeType: "application/vnd.google-apps.spreadsheet",
    },
    fields: "id, webViewLink",
  });

  const id = create.data.id!;
  const url = create.data.webViewLink || `https://docs.google.com/spreadsheets/d/${id}`;
  return { id, url };
}

export async function sheetsAppend(
  reqOrToken: NextApiRequest | string,
  spreadsheetId: string,
  rangeA1: string,
  values: any[][]
) {
  const auth =
    typeof reqOrToken === "string" ? authFromAccessToken(reqOrToken) : await getGoogleAuthFromReq(reqOrToken);
  const sheets = google.sheets({ version: "v4", auth });

  const r = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: rangeA1,
    valueInputOption: "RAW",
    requestBody: {
      values,
    },
  });
  return r.data;
}

export async function sheetsGet(reqOrToken: NextApiRequest | string, spreadsheetId: string, rangeA1: string) {
  const auth =
    typeof reqOrToken === "string" ? authFromAccessToken(reqOrToken) : await getGoogleAuthFromReq(reqOrToken);
  const sheets = google.sheets({ version: "v4", auth });

  const r = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: rangeA1,
  });
  return r.data;
}
