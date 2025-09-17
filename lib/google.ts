// /lib/google.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
// Adjust if your auth options file lives elsewhere:
import { authOptions } from "../pages/api/auth/[...nextauth]";

/* -------------------- Core session/token helpers -------------------- */

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
    return txt; // OK but not JSON
  }
}

/* -------------------- Back-compat shims used by your code --------------------
   These accept either:
   A) gaRunReport(token, propertyId, start, end)
   B) gaRunReport(req, res, propertyId, start, end)
   Same idea for gscTimeseriesClicks.
--------------------------------------------------------------------------- */

function isReqRes(a: any, b: any): a is NextApiRequest {
  return a && typeof a === "object" && "headers" in a && b && "status" in b;
}

/**
 * GA4: run a simple date x sessions report.
 * Returns: { rows: {date: string, sessions: number}[] }
 */
export async function gaRunReport(
  a: string | NextApiRequest,
  b: string | NextApiResponse,
  propertyId?: string,
  start?: string,
  end?: string
): Promise<{ rows: { date: string; sessions: number }[] }> {
  let token: string;
  let prop = propertyId;
  let s = start;
  let e = end;

  if (isReqRes(a, b)) {
    token = await getAccessToken(a as NextApiRequest, b as NextApiResponse);
  } else {
    token = String(a);
    prop = String(b);
  }
  if (!prop) throw new Error("propertyId required");
  if (!s || !e) throw new Error("start and end required (YYYY-MM-DD)");

  const url = `https://analyticsdata.googleapis.com/v1beta/${prop}:runReport`;
  const body = {
    dateRanges: [{ startDate: s, endDate: e }],
    metrics: [{ name: "sessions" }],
    dimensions: [{ name: "date" }],
  };

  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await forwardJsonOrText(r);
  const rows =
    (data as any).rows?.map((row: any) => ({
      date: row.dimensionValues?.[0]?.value ?? "",
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
    })) ?? [];

  return { rows };
}

/**
 * GSC: clicks & impressions timeseries by day.
 * Returns: { rows: {date, clicks, impressions, ctr, position}[] }
 * Usage:
 *   gscTimeseriesClicks(token, siteUrl, start, end)
 *   gscTimeseriesClicks(req, res, siteUrl, start, end)
 */
export async function gscTimeseriesClicks(
  a: string | NextApiRequest,
  b: string | NextApiResponse,
  siteUrl?: string,
  start?: string,
  end?: string
): Promise<{
  rows: { date: string; clicks: number; impressions: number; ctr: number; position: number }[];
}> {
  let token: string;
  let site = siteUrl;
  let s = start;
  let e = end;

  if (isReqRes(a, b)) {
    token = await getAccessToken(a as NextApiRequest, b as NextApiResponse);
  } else {
    token = String(a);
    site = String(b);
  }
  if (!site) throw new Error("siteUrl required");
  if (!s || !e) throw new Error("start and end required (YYYY-MM-DD)");

  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    site
  )}/searchAnalytics/query`;

  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      startDate: s,
      endDate: e,
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

  return { rows };
}
