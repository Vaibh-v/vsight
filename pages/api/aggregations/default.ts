// pages/api/aggregations/default.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gaRunReport, gscQuery } from "@/lib/google";

/**
 * Returns daily aggregates merged from:
 *  - GA4 (sessions)
 *  - GSC (clicks, impressions, ctr, position)
 *
 * Query params:
 *  - propertyId: GA4 property id (required for GA part)
 *  - siteUrl: GSC site url (optional; if missing, GSC part is skipped)
 *  - startDate, endDate (YYYY-MM-DD)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { propertyId, siteUrl, startDate, endDate } = (req.query || {}) as any;
    const accessToken = String(token.access_token);

    // Basic input guardrails
    const start = String(startDate || "").trim();
    const end = String(endDate || "").trim();
    if (!start || !end) {
      return res.status(400).json({ error: "Missing startDate/endDate" });
    }

    // Prepare calls (GSC is optional)
    const wantGA = !!propertyId;
    const wantGSC = !!siteUrl;

    const gaPromise = wantGA
      ? gaRunReport(accessToken, String(propertyId), {
          dimensions: ["date"],
          metrics: ["sessions"],
          dateRanges: [{ startDate: start, endDate: end }],
        })
      : Promise.resolve(null);

    const gscPromise = wantGSC
      ? gscQuery(accessToken, String(siteUrl), {
          startDate: start,
          endDate: end,
          dimensions: ["date"],
          rowLimit: 1000,
          type: "web",
        })
      : Promise.resolve([]);

    const [gaRep, gscRows] = await Promise.all([gaPromise, gscPromise]);

    // Normalize GA
    type GaRow = { date: string; sessions: number };
    const gaRows: GaRow[] = Array.isArray((gaRep as any)?.rows)
      ? (gaRep as any).rows.map((r: any) => ({
          date: String(r?.dimensionValues?.[0]?.value || ""),
          sessions: Number(r?.metricValues?.[0]?.value ?? 0),
        }))
      : [];

    // gscQuery already returns a normalized array of rows:
    // [{ date, clicks, impressions, ctr, position }]
    type GscRow = { date?: string; clicks: number; impressions: number; ctr: number; position: number };
    const gRows: GscRow[] = Array.isArray(gscRows) ? (gscRows as GscRow[]) : [];

    // Merge by date
    const map = new Map<
      string,
      {
        date: string;
        sessions?: number;
        clicks?: number;
        impressions?: number;
        ctr?: number;
        position?: number;
      }
    >();

    const toKey = (d: string) => d; // dates already YYYY-MM-DD from both APIs

    // GA into map
    for (const r of gaRows) {
      const k = toKey(r.date || "");
      if (!k) continue;
      const row = map.get(k) || { date: k };
      row.sessions = Number(r.sessions ?? 0);
      map.set(k, row);
    }

    // GSC into map
    for (const r of gRows) {
      const k = toKey(String(r.date || ""));
      if (!k) continue;
      const row = map.get(k) || { date: k };
      row.clicks = Number(r.clicks ?? 0);
      row.impressions = Number(r.impressions ?? 0);
      // Keep ctr/position numeric (not % string). If you want % later, do it in the UI.
      row.ctr = Number(r.ctr ?? 0);
      row.position = Number(r.position ?? 0);
      map.set(k, row);
    }

    const data = Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
    return res.status(200).json({ data });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
