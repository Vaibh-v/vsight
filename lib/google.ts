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
    c
