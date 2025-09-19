// lib/google.ts
import type { NextApiRequest } from "next";
import { getToken } from "next-auth/jwt";

/** ---------- helpers ---------- */

export class HttpError extends Error {
  status: number;
  details?: any;
  constructor(status: number, message: string, details?: any) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function getAccessTokenFromReq(req: NextApiRequest): Promise<string> {
  const tok = await getToken({ req });
  const accessToken = (tok as any)?.accessToken as string | undefined;
  if (!accessToken) {
    throw new HttpError(401, "Missing Google access token on session");
  }
  return accessToken;
}

async function googleFetch(
  req: NextApiRequest,
  url: string,
  init: RequestInit = {}
) {
  const token = await getAccessTokenFromReq(req);
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  if (init.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, { ...init, headers });
  return res;
}

export async function forwardJsonOrText(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    let payload: any = undefined;
    try {
      payload = ct.includes("application/json") ? await res.json() : await res.text();
    } catch {
      /* noop */
    }
    const msg =
      (payload && (payload.error?.message || payload.message)) ||
      `HTTP ${res.status}`;
    throw new HttpError(res.status, msg, payload);
  }
  return ct.includes("application/json") ? await res.json() : await res.text();
}

/** ---------- GA4 (Analytics Data / Admin) ---------- */

export async function gaRunReport(
  req: NextApiRequest,
  propertyId: string,
  body: Record<string, any>
): Promise<{ rows: Array<Record<string, any>>; raw: any }> {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(
    propertyId
  )}:runReport`;
  const res = await googleFetch(req, url, { method: "POST", body: JSON.stringify(body) });
  const json = await forwardJsonOrText(res);

  const dimNames: string[] = body?.dimensions?.map((d: any) => d.name) ?? [];
  const metNames: string[] = body?.metrics?.map((m: any) => m.name) ?? [];

  const rows =
    json?.rows?.map((r: any) => {
      const obj: Record<string, any> = {};
      dimNames.forEach((name, i) => {
        obj[name] = r.dimensionValues?.[i]?.value ?? null;
      });
      metNames.forEach((name, i) => {
        const v = r.metricValues?.[i]?.value;
        obj[name] = v == null ? null : Number(v);
      });
      return obj;
    }) ?? [];

  return { rows, raw: json };
}

export async function gaListProperties(
  req: NextApiRequest
): Promise<{ rows: Array<{ propertyId: string; displayName: string; account: string; name: string }>; raw: any }> {
  const url = "https://analyticsadmin.googleapis.com/v1alpha/accountSummaries";
  const res = await googleFetch(req, url);
  const json = await forwardJsonOrText(res);

  const rows: Array<{ propertyId: string; displayName: string; account: string; name: string }> = [];
  for (const a of json?.accountSummaries ?? []) {
    for (const p of a.propertySummaries ?? []) {
      rows.push({
        propertyId: String(p.property)?.split("/").pop() || "",
        displayName: p.displayName,
        account: a.account,
        name: p.property,
      });
    }
  }
  return { rows, raw: json };
}

/** ---------- Google Search Console ---------- */

export async function gscSites(
  req: NextApiRequest
): Promise<{ sites: Array<{ siteUrl: string; permissionLevel?: string }>; raw: any }> {
  const url = "https://www.googleapis.com/webmasters/v3/sites/list";
  const res = await googleFetch(req, url);
  const json = await forwardJsonOrText(res);
  const sites = (json?.siteEntry ?? []).map((s: any) => ({
    siteUrl: s.siteUrl,
    permissionLevel: s.permissionLevel,
  }));
  return { sites, raw: json };
}

export async function gscTimeseries(
  req: NextApiRequest,
  siteUrl: string,
  start: string,
  end: string
): Promise<{
  rows: Array<{ date: string; clicks: number; impressions: number; ctr: number; position: number }>;
  raw: any;
}> {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;
  const body = {
    startDate: start,
    endDate: end,
    dimensions: ["date"],
    rowLimit: 1000,
  };
  const res = await googleFetch(req, url, { method: "POST", body: JSON.stringify(body) });
  const json = await forwardJsonOrText(res);
  const rows =
    json?.rows?.map((r: any) => ({
      date: r.keys?.[0] ?? "",
      clicks: Number(r.clicks ?? 0),
      impressions: Number(r.impressions ?? 0),
      ctr: Number(r.ctr ?? 0),
      position: Number(r.position ?? 0),
    })) ?? [];
  return { rows, raw: json };
}

export async function gscTopQueries(
  req: NextApiRequest,
  siteUrl: string,
  start: string,
  end: string,
  rowLimit: number = 250
): Promise<{
  rows: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
  raw: any;
}> {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;
  const body = {
    startDate: start,
    endDate: end,
    dimensions: ["query"],
    rowLimit,
    startRow: 0,
  };
  const res = await googleFetch(req, url, { method: "POST", body: JSON.stringify(body) });
  const json = await forwardJsonOrText(res);
  const rows =
    json?.rows?.map((r: any) => ({
      query: r.keys?.[0] ?? "",
      clicks: Number(r.clicks ?? 0),
      impressions: Number(r.impressions ?? 0),
      ctr: Number(r.ctr ?? 0),
      position: Number(r.position ?? 0),
    })) ?? [];
  return { rows, raw: json };
}

/** ---------- Drive & Sheets ---------- */

export async function driveFindOrCreateSpreadsheet(
  req: NextApiRequest,
  name: string
): Promise<{ fileId: string }> {
  // search
  const q = encodeURIComponent(
    `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
  );
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`;
  const searchRes = await googleFetch(req, searchUrl);
  const searchJson = await forwardJsonOrText(searchRes);
  const found = searchJson?.files?.[0];
  if (found?.id) return { fileId: found.id };

  // create
  const createUrl = "https://www.googleapis.com/drive/v3/files";
  const body = { name, mimeType: "application/vnd.google-apps.spreadsheet" };
  const createRes = await googleFetch(req, createUrl, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const createJson = await forwardJsonOrText(createRes);
  return { fileId: createJson.id };
}

export async function sheetsGet(
  req: NextApiRequest,
  spreadsheetId: string,
  range: string
): Promise<{ values: string[][] }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(range)}`;
  const res = await googleFetch(req, url);
  const json = await forwardJsonOrText(res);
  return { values: (json?.values as string[][]) ?? [] };
}

export async function sheetsAppend(
  req: NextApiRequest,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<{ updates: any }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW`;
  const res = await googleFetch(req, url, {
    method: "POST",
    body: JSON.stringify({ values }),
  });
  const json = await forwardJsonOrText(res);
  return { updates: json?.updates };
}
