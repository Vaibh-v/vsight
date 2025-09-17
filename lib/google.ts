// /lib/google.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
// If your auth options path differs, update the import below:
import { authOptions } from "../pages/api/auth/[...nextauth]";

/* ------------------------------------------------------------------ */
/*                          Session / Token                            */
/* ------------------------------------------------------------------ */

export async function getAccessToken(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<string> {
  const session = await getServerSession(req, res, authOptions as any);
  if (!session) throw new Error("No session. Please sign out and sign in again.");

  const token =
    (session as any).accessToken ||
    (session as any).token?.access_token ||
    (session as any).user?.accessToken;

  if (!token) {
    throw new Error(
      "No Google access token on session. Reconnect Google (sign out/in)."
    );
  }
  return String(token);
}

export async function forwardJsonOrText(r: Response) {
  const txt = await r.text();
  try {
    const json = JSON.parse(txt);
    if (!r.ok) {
      throw new Error(
        `HTTP ${r.status} ${r.statusText}: ${JSON.stringify(json).slice(0, 400)}`
      );
    }
    return json;
  } catch {
    if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}: ${txt.slice(0, 400)}`);
    return txt; // successful non-JSON
  }
}

/* ------------------------------------------------------------------ */
/*                         Back-compat helpers                         */
/* ------------------------------------------------------------------ */

function looksLikeReqRes(a: any, b: any): a is NextApiRequest {
  return a && typeof a === "object" && "headers" in a && b && "status" in b;
}

/**
 * GA4 runReport
 *
 * Flexible signatures supported:
 * 1) gaRunReport(token, propertyId, body)
 * 2) gaRunReport(token, propertyId, start, end)
 * 3) gaRunReport(req, res, propertyId, body)
 * 4) gaRunReport(req, res, propertyId, start, end)
 *
 * When using (start, end), a default body is built:
 *   dimensions: ["date"], metrics: ["sessions"], dateRanges: [{startDate, endDate}]
 */
export async function gaRunReport(
  a: string | NextApiRequest,
  b: string | NextApiResponse,
  propertyId: string,
  bodyOrStart: Record<string, any> | string,
  maybeEnd?: string
): Promise<{ rows: { [k: string]: string | number }[]; raw: any }> {
  // Resolve token
  const token = looksLikeReqRes(a, b)
    ? await getAccessToken(a as NextApiRequest, b as NextApiResponse)
    : String(a);

  if (!propertyId) throw new Error("propertyId required");

  // Build body
  let body: any;
  if (typeof bodyOrStart === "object" && bodyOrStart) {
    body = bodyOrStart;
  } else {
    const start = String(bodyOrStart);
    const end = String(maybeEnd);
    if (!start || !end)
      throw new Error(
        "When not passing a body object, start and end (YYYY-MM-DD) are required."
      );
    body = {
      dimensions: [{ name: "date" }],
      metrics: [{ name: "sessions" }],
      dateRanges: [{ startDate: start, endDate: end }],
    };
  }

  const url = `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await forwardJsonOrText(r);

  // Normalize rows into a simple array of key/value pairs
  const rows =
    (data as any).rows?.map((row: any) => {
      const obj: Record<string, string | number> = {};
      (data as any).dimensionHeaders?.forEach((d: any, i: number) => {
        obj[d.name] = row.dimensionValues?.[i]?.value ?? "";
      });
      (data as any).metricHeaders?.forEach((m: any, i: number) => {
        const val = row.metricValues?.[i]?.value;
        obj[m.name] = val !== undefined ? Number(val) : 0;
      });
      return obj;
    }) ?? [];

  return { rows, raw: data };
}

/**
 * GSC timeseries by day (clicks, impressions, ctr, position).
 *
 * Signatures:
 *   gscTimeseriesClicks(token, siteUrl, start, end)
 *   gscTimeseriesClicks(req, res, siteUrl, start, end)
 */
export async function gscTimeseriesClicks(
  a: string | NextApiRequest,
  b: string | NextApiResponse,
  siteUrl: string,
  start: string,
  end: string
): Promise<{
  rows: { date: string; clicks: number; impressions: number; ctr: number; position: number }[];
  raw: any;
}> {
  const token = looksLikeReqRes(a, b)
    ? await getAccessToken(a as NextApiRequest, b as NextApiResponse)
    : String(a);

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

  const data = await forwardJsonOrText(r);
  const rows =
    (data as any).rows?.map((x: any) => ({
      date: x.keys?.[0] ?? "",
      clicks: Number(x.clicks ?? 0),
      impressions: Number(x.impressions ?? 0),
      ctr: Number(x.ctr ?? 0),
      position: Number(x.position ?? 0),
    })) ?? [];

  return { rows, raw: data };
}
