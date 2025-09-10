import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gaRunReport, gscQuery } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const { propertyId, siteUrl, startDate, endDate } = (req.query || {}) as any;
    if (!propertyId || !siteUrl || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing params" });
    }

    const [ga, gsc] = await Promise.all([
      gaRunReport(String(token.access_token), String(propertyId), {
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }],
        dateRanges: [{ startDate, endDate }],
      }),
      gscQuery(String(token.access_token), String(siteUrl), {
        startDate,
        endDate,
        dimensions: ["date"],
        type: "web",
        rowLimit: 25000,
      }),
    ]);

    const sessionsByDate: Record<string, number> = {};
    const gaRows = Array.isArray(ga?.rows) ? ga.rows : [];
    for (const row of gaRows) {
      const d = row?.dimensionValues?.[0]?.value || "";
      const v = Number(row?.metricValues?.[0]?.value || 0);
      sessionsByDate[d] = v;
    }

    const clicksByDate: Record<string, number> = {};
    const impressionsByDate: Record<string, number> = {};
    const positionByDate: Record<string, number> = {};
    const gscRows = Array.isArray(gsc?.rows) ? gsc.rows : [];
    for (const row of gscRows) {
      const d = row?.keys?.[0];
      if (!d) continue;
      clicksByDate[d] = Number(row?.clicks || 0);
      impressionsByDate[d] = Number(row?.impressions || 0);
      positionByDate[d] = Number(row?.position || 0);
    }

    const dates = Array.from(new Set([...Object.keys(sessionsByDate), ...Object.keys(clicksByDate)])).sort();
    const series = dates.map((d) => {
      const clicks = clicksByDate[d] || 0;
      const impr = impressionsByDate[d] || 0;
      return {
        date: d,
        sessions: sessionsByDate[d] || 0,
        clicks,
        impressions: impr,
        ctr: impr ? clicks / impr : 0,
        position: positionByDate[d] || 0,
      };
    });

    res.status(200).json({ series });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
