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

/* ------------------------------------------------------------------ */
/*                    GA Admin: list GA4 properties                    */
/* ------------------------------------------------------------------ */
/**
 * Flexible usage:
 *  - gaListProperties(token)
 *  - gaListProperties(req, res)
 *
 * Returns: { properties: { name: string; propertyId: string; displayName?: string }[] }
 */
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

/* ------------------------------------------------------------------ */
/*                          GA4 runReport API                          */
/* ------------------------------------------------------------------ */
/**
 * Flexible usage (single function, no TS overloads):
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

/* ------------------------------------------------------------------ */
/*                   GSC daily clicks / impressions                    */
/* ------------------------------------------------------------------ */
/**
 * Flexible usage:
 *  - gscTimeseriesClicks(token, siteUrl, start, end)
 *  - gscTimeseriesClicks(req, res, siteUrl, start, end)
 */
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
