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

async function parseJsonOrThrow(r: Response) {
  const text = await r.text();
  try {
    const json = JSON.parse(text);
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(json).slice(0, 400)}`);
    return json;
  } catch {
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 400)}`);
    return text;
  }
}

function isReqRes(a: any, b: any): a is NextApiRequest {
  return a && typeof a === "object" && "headers" in a && b && "status" in b;
}

/* ------------------------------------------------------------------ */
/*                          GA4 runReport API                          */
/* ------------------------------------------------------------------ */
/** Overloads (so your 3-arg call compiles):
 *  gaRunReport(token, propertyId, body)
 *  gaRunReport(token, propertyId, start, end)
 *  gaRunReport(req, res, propertyId, body)
 *  gaRunReport(req, res, propertyId, start, end)
 */
export async function gaRunReport(
  token: string,
  propertyId: string,
  body: Record<string, any>
): Promise<{ rows: Record<string, string | number>[]; raw: any }>;
export async function gaRunReport(
  token: string,
  propertyId: string,
  start: string,
  end: string
): Promise<{ rows: Record<string, string | number>[]; raw: any }>;
export async function gaRunReport(
  req: NextApiRequest,
  res: NextApiResponse,
  propertyId: string,
  body: Record<string, any>
): Promise<{ rows: Record<string, string | number>[]; raw: any }>;
export async function gaRunReport(
  req: NextApiRequest,
  res: NextApiResponse,
  propertyId: string,
  start: string,
  end: string
): Promise<{ rows: Record<string, string | number>[]; raw: any }>;
export async function gaRunReport(
  a: string | NextApiRequest,
  b: string | NextApiResponse | string,
  c: string,
  d?: Record<string, any> | string,
  e?: string
): Promise<{ rows: Record<string, string | number>[]; raw: any }> {
  // Resolve token
  const token = isReqRes(a, b as any)
    ? await getAccessToken(a as NextApiRequest, b as NextApiResponse)
    : String(a);

  const propertyId = String(c);
  if (!propertyId) throw new Error("propertyId required");

  // Build request body
  let body: any;
  if (typeof d === "object" && d) {
    body = d; // full custom body
  } else if (typeof d === "string" && typeof e === "string") {
    body = {
      dimensions: [{ name: "date" }],
      metrics: [{ name: "sessions" }],
      dateRanges: [{ startDate: d, endDate: e }],
    };
  } else {
    throw new Error(
      "Invalid arguments. Pass (token, propertyId, body) or (token, propertyId, start, end)."
    );
  }

  const url = `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseJsonOrThrow(r);

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
/** Overloads:
 *  gscTimeseriesClicks(token, siteUrl, start, end)
 *  gscTimeseriesClicks(req, res, siteUrl, start, end)
 */
export async function gscTimeseriesClicks(
  token: string,
  siteUrl: string,
  start: string,
  end: string
): Promise<{ rows: { date: string; clicks: number; impressions: number; ctr: number; position: number }[]; raw: any }>;
export async function gscTimeseriesClicks(
  req: NextApiRequest,
  res: NextApiResponse,
  siteUrl: string,
  start: string,
  end: string
): Promise<{ rows: { date: string; clicks: number; impressions: number; ctr: number; position: number }[]; raw: any }>;
export async function gscTimeseriesClicks(
  a: string | NextApiRequest,
  b: string | NextApiResponse | string,
  c?: string,
  d?: string,
  e?: string
) {
  const token = isReqRes(a, b as any)
    ? await getAccessToken(a as NextApiRequest, b as NextApiResponse)
    : String(a);

  const siteUrl = isReqRes(a, b as any) ? String(c) : String(b);
  const start = isReqRes(a, b as any) ? String(d) : String(c);
  const end = isReqRes(a, b as any) ? String(e) : String(d);

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
  const data = await parseJsonOrThrow(r);

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
