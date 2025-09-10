import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gaRunReport, gscTimeseriesClicks } from "@/lib/google";

/**
 * Combined daily series for GA sessions + GSC clicks/impressions/ctr.
 * Accepts either `start/end` or `startDate/endDate` query params.
 * Query: ?propertyId=XXXX&siteUrl=https://example.com&start=YYYY-MM-DD&end=YYYY-MM-DD
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      propertyId,
      siteUrl,
      start,
      end,
      startDate,
      endDate,
    } = req.query as Record<string, string>;

    const s = start || startDate;
    const e = end || endDate;

    if (!propertyId || !siteUrl || !s || !e) {
      return res.status(400).json({ error: "Missing params (propertyId, siteUrl, start, end)" });
    }

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    // GA: sessions by date
    const gaRows = await gaRunReport(String(token.access_token), String(propertyId), {
      dimensions: [{ name: "date" }],
      metrics: [{ name: "sessions" }],
      dateRanges: [{ startDate: s, endDate: e }],
    }); // -> [{ date: 'YYYYMMDD', sessions: number }]

    // GSC: clicks, impressions, ctr, position by date
    const gscRows = await gscTimeseriesClicks(
      String(token.access_token),
      String(siteUrl),
      String(s),
      String(e)
    ); // -> [{ date: 'YYYY-MM-DD', clicks, impressions, ctr, position }]

    // Normalize date formats to the same key to merge:
    // - GA uses YYYYMMDD
    // - GSC uses YYYY-MM-DD
    const toKey = (d: string) => (d.includes("-") ? d.replace(/-/g, "") : d);

    const map = new Map<string, any>();

    for (const r of gaRows) {
      const k = toKey(r.date);
      map.set(k, { date: k, sessions: Number(r.sessions) || 0 });
    }

    for (const r of gscRows) {
      const k = toKey(r.date);
      const row = map.get(k) || { date: k };
      row.clicks = Number(r.clicks) || 0;
      row.impressions = Number(r.impressions) || 0;
      // Convert ctr to percentage with 2 decimals for consistency
      row.ctr = Number(((Number(r.ctr) || 0) * 100).toFixed(2));
      row.position = Number(r.position) || 0;
      map.set(k, row);
    }

    // Sort by date ascending (YYYYMMDD is lexicographically sortable)
    const series = Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));

    return res.status(200).json({ series });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Unexpected error" });
  }
}
