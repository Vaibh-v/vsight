// /lib/google.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
// If this path differs in your repo, update it:
import { authOptions } from "../pages/api/auth/[...nextauth]";

/* ------------------------------------------------------------------ */
/*                         auth / token helpers                        */
/* ------------------------------------------------------------------ */

export async function getAccessToken(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<string> {
  const session = await getServerSession(req, res, authOptions as any);
  if (!session) throw new Error("No session. Please sign in again.");

  const token =
    (session as any).accessToken ||
    (session as any).token?.access_token ||
    (session as any).user?.accessToken;

  if (!token) throw new Error("No Google access token on session.");
  return String(token);
}

export async function forwardJsonOrText(r: Response) {
  const text = await r.text();
  try {
    const json = JSON.parse(text);
    if (!r.ok) {
      throw new Error(`HTTP ${r.status} ${r.statusText}: ${JSON.stringify(json).slice(0, 400)}`);
    }
    return json;
  } catch {
    if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}: ${text.slice(0, 400)}`);
    return text; // non-JSON but success
  }
}

function isReqRes(a: any, b: any): a is NextApiRequest {
  return a && typeof a === "object" && "headers" in a && b && typeof b === "object" && "status" in b;
}

/* ================================================================== */
/*                     GOOGLE ANALYTICS (GA4)                          */
/* ================================================================== */

/** GA Admin: list GA4 properties visible to the user */
export async function gaListProperties(...args: any[]): Promise<{
  properties: { name: string; propertyId: string; displayName?: string }[];
  raw: any;
}> {
  const token = isReqRes(args[0], args[1])
    ? await getAccessToken(args[0] as NextApiRequest, args[1] as NextApiResponse)
    : String(args[0]);

  const url = "https://analyticsadmin.googleapis.com/v1alpha/accountSummaries";
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data: any = await forwardJsonOrText(r);

  const properties: { name: string; propertyId: string; displayName?: string }[] = [];
  for (const acc of data?.accountSummaries ?? []) {
    for (const p of acc.propertySummaries ?? []) {
      properties.push({
        name: p.displayName,
        propertyId: p.property, // e.g. "properties/123456789"
        displayName: p.displayName,
      });
    }
  }
  return { properties, raw: data };
}

/**
 * GA4 runReport helper (flexible signatures):
 *  - gaRunReport(token, propertyId, body)
 *  - gaRunReport(token, propertyId, start, end)
 *  - gaRunReport(req, res, propertyId, body)
 *  - gaRunReport(req, res, propertyId, start, end)
 */
export async function gaRunReport(...args: any[]): Promise<{ rows: Record<string, string | number>[]; raw: any }> {
  let token: string;
  let propertyId: string;
  let body: any | undefined;

  if (isReqRes(args[0], args[1])) {
    token = await getAccessToken(args[0] as NextApiRequest, args[1] as NextApiResponse);
    propertyId = String(args[2]);
    const d = args[3];
    const e = args[4];

    if (typeof d === "object" && d) {
      body = d; // custom body
    } else if (typeof d === "string" && typeof e === "string") {
      body = {
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }],
        dateRanges: [{ startDate: d, endDate: e }],
      };
    }
  } else {
    token = String(args[0]);
    propertyId = String(args[1]);
    const d = args[2];
    const e = args[3];

    if (typeof d === "object" && d) {
      body = d;
    } else if (typeof d === "string" && typeof e === "string") {
      body = {
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }],
        dateRanges: [{ startDate: d, endDate: e }],
      };
    }
  }

  if (!propertyId) throw new Error("propertyId required");
  if (!body) throw new Error("Invalid arguments for gaRunReport: pass (body) or (start, end).");

  const url = `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: any = await forwardJsonOrText(r);

  const rows =
    data?.rows?.map((row: any) => {
      const out: Record<string, string | number> = {};
      data.dimensionHeaders?.forEach((h: any, i: number) => {
        out[h.name] = row.dimensionValues?.[i]?.value ?? "";
      });
      data.metricHeaders?.forEach((h: any, i: number) => {
        const v = row.metricValues?.[i]?.value;
        out[h.name] = v !== undefined ? Number(v) : 0;
      });
      return out;
    }) ?? [];

  return { rows, raw: data };
}

/* ================================================================== */
/*                    GOOGLE SEARCH CONSOLE (GSC)                      */
/* ================================================================== */

/** Return verified sites for the user */
export async function gscSites(...args: any[]): Promise<{
  sites: { siteUrl: string; permissionLevel?: string; type?: string }[];
  raw: any;
}> {
  const token = isReqRes(args[0], args[1])
    ? await getAccessToken(args[0] as NextApiRequest, args[1] as NextApiResponse)
    : String(args[0]);

  const url = "https://www.googleapis.com/webmasters/v3/sites";
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data: any = await forwardJsonOrText(r);

  const sites =
    (data?.siteEntry ?? []).map((s: any) => ({
      siteUrl: s.siteUrl,
      permissionLevel: s.permissionLevel,
      type: s.siteType,
    })) ?? [];

  return { sites, raw: data };
}

/** Daily clicks/impressions time series */
export async function gscTimeseriesClicks(...args: any[]): Promise<{
  rows: { date: string; clicks: number; impressions: number; ctr: number; position: number }[];
  raw: any;
}> {
  let token: string;
  let siteUrl: string;
  let start: string;
  let end: string;

  if (isReqRes(args[0], args[1])) {
    token = await getAccessToken(args[0] as NextApiRequest, args[1] as NextApiResponse);
    siteUrl = String(args[2]);
    start = String(args[3]);
    end = String(args[4]);
  } else {
    token = String(args[0]);
    siteUrl = String(args[1]);
    start = String(args[2]);
    end = String(args[3]);
  }

  if (!siteUrl) throw new Error("siteUrl required");
  if (!start || !end) throw new Error("start and end required (YYYY-MM-DD)");

  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;

  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      startDate: start,
      endDate: end,
      dimensions: ["date"],
      rowLimit: 1000,
    }),
  });
  const data: any = await forwardJsonOrText(r);

  const rows =
    data?.rows?.map((x: any) => ({
      date: x.keys?.[0] ?? "",
      clicks: Number(x.clicks ?? 0),
      impressions: Number(x.impressions ?? 0),
      ctr: Number(x.ctr ?? 0),
      position: Number(x.position ?? 0),
    })) ?? [];

  return { rows, raw: data };
}

/** Top queries list with optional filters */
export async function gscTopQueries(...args: any[]): Promise<{
  rows: { query: string; clicks: number; impressions: number; ctr: number; position: number }[];
  raw: any;
}> {
  let token: string;
  let siteUrl: string;
  let start: string;
  let end: string;
  let options: {
    country?: string;
    device?: "DESKTOP" | "MOBILE" | "TABLET";
    page?: string;
    queryContains?: string;
    rowLimit?: number;
  } = {};

  if (isReqRes(args[0], args[1])) {
    token = await getAccessToken(args[0] as NextApiRequest, args[1] as NextApiResponse);
    siteUrl = String(args[2]);
    start = String(args[3]);
    end = String(args[4]);
    options = (args[5] ?? {}) as typeof options;
  } else {
    token = String(args[0]);
    siteUrl = String(args[1]);
    start = String(args[2]);
    end = String(args[3]);
    options = (args[4] ?? {}) as typeof options;
  }

  if (!siteUrl) throw new Error("siteUrl required");
  if (!start || !end) throw new Error("start and end required (YYYY-MM-DD)");

  const body: any = {
    startDate: start,
    endDate: end,
    dimensions: ["query"],
    rowLimit: options.rowLimit ?? 100,
  };

  const filters: any[] = [];
  if (options.country) {
    filters.push({ dimension: "country", operator: "equals", expression: options.country.toUpperCase() });
  }
  if (options.device) {
    filters.push({ dimension: "device", operator: "equals", expression: options.device });
  }
  if (options.page) {
    filters.push({ dimension: "page", operator: "equals", expression: options.page });
  }
  if (options.queryContains) {
    filters.push({ dimension: "query", operator: "contains", expression: options.queryContains });
  }
  if (filters.length) {
    body.dimensionFilterGroups = [{ groupType: "and", filters }];
  }

  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;

  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: any = await forwardJsonOrText(r);

  const rows =
    data?.rows?.map((x: any) => ({
      query: x.keys?.[0] ?? "",
      clicks: Number(x.clicks ?? 0),
      impressions: Number(x.impressions ?? 0),
      ctr: Number(x.ctr ?? 0),
      position: Number(x.position ?? 0),
    })) ?? [];

  return { rows, raw: data };
}

/* ================================================================== */
/*              GOOGLE DRIVE + GOOGLE SHEETS (for settings)           */
/* ================================================================== */

/**
 * Find a spreadsheet by title in Drive; if missing, create it.
 *
 * Flexible usage:
 *  - driveFindOrCreateSpreadsheet(token, title, options?)
 *  - driveFindOrCreateSpreadsheet(req, res, title, options?)
 *
 * options?: { folderId?: string }
 *
 * Returns: { spreadsheetId, url, created: boolean, fileId }
 */
export async function driveFindOrCreateSpreadsheet(...args: any[]): Promise<{
  spreadsheetId: string;
  url: string;
  created: boolean;
  fileId: string;
  raw?: any;
}> {
  let token: string;
  let title: string;
  let options: { folderId?: string } = {};

  if (isReqRes(args[0], args[1])) {
    token = await getAccessToken(args[0] as NextApiRequest, args[1] as NextApiResponse);
    title = String(args[2]);
    options = (args[3] ?? {}) as typeof options;
  } else {
    token = String(args[0]);
    title = String(args[1]);
    options = (args[2] ?? {}) as typeof options;
  }

  if (!title) throw new Error("title is required");

  // 1) Search Drive for an existing spreadsheet with this title
  const query =
    `name='${title.replace(/'/g, "\\'")}'` +
    ` and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;

  const searchUrl =
    "https://www.googleapis.com/drive/v3/files" +
    `?q=${encodeURIComponent(query)}` +
    "&fields=files(id,name,webViewLink,parents)";
  const sr = await fetch(searchUrl, { headers: { Authorization: `Bearer ${token}` } });
  const sdata: any = await forwardJsonOrText(sr);

  if (sdata?.files?.length) {
    const f = sdata.files[0];
    return {
      spreadsheetId: f.id,
      url: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}/edit`,
      created: false,
      fileId: f.id,
      raw: sdata,
    };
  }

  // 2) Create new spreadsheet via Sheets API
  const createUrl = "https://sheets.googleapis.com/v4/spreadsheets";
  const cr = await fetch(createUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ properties: { title } }),
  });
  const created: any = await forwardJsonOrText(cr);

  let fileId = created?.spreadsheetId as string;
  if (!fileId) throw new Error("Failed to create spreadsheet.");

  // 3) If folderId provided, move file into that folder
  if (options.folderId) {
    const moveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${encodeURIComponent(
      options.folderId
    )}&removeParents=root&fields=id,parents,webViewLink`;
    const mr = await fetch(moveUrl, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    await forwardJsonOrText(mr);
  }

  return {
    spreadsheetId: fileId,
    url: `https://docs.google.com/spreadsheets/d/${fileId}/edit`,
    created: true,
    fileId,
    raw: created,
  };
}

/**
 * Read a range from a Google Sheet.
 *
 * Flexible usage:
 *  - sheetsGet(token, spreadsheetId, rangeA1)
 *  - sheetsGet(req, res, spreadsheetId, rangeA1)
 *
 * Returns: { values?: string[][], raw }
 */
export async function sheetsGet(...args: any[]): Promise<{ values?: string[][]; raw: any }> {
  let token: string;
  let spreadsheetId: string;
  let rangeA1: string;

  if (isReqRes(args[0], args[1])) {
    token = await getAccessToken(args[0] as NextApiRequest, args[1] as NextApiResponse);
    spreadsheetId = String(args[2]);
    rangeA1 = String(args[3]);
  } else {
    token = String(args[0]);
    spreadsheetId = String(args[1]);
    rangeA1 = String(args[2]);
  }

  if (!spreadsheetId) throw new Error("spreadsheetId is required");
  if (!rangeA1) throw new Error("rangeA1 is required");

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(rangeA1)}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data: any = await forwardJsonOrText(r);
  return { values: data?.values, raw: data };
}
