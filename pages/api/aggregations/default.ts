// pages/api/aggregations/default.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gaRunReport, gscQuery } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { propertyId, siteUrl, startDate, endDate } = req.query as any;
  if (!propertyId || !siteUrl || !startDate || !endDate) {
    return res.status(400).json({ error: "Missing params" });
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

  try {
    // GA4 sessions by date
    const ga = await gaRunReport(String(token.access_token), String(propertyId), {
      dimensions: [{ name: "date" }],
      metrics: [{ name: "sessions" }],
      dateRanges: [{ startDate: String(startDate), endDate: String(endDate) }],
    });

    // GSC clicks/impressions by date
    const gsc = await gscQuery(String(token.access_token), String(siteUrl), {
      startDate: String(startDate),
      endDate: String(endDate),
      dimensions: ["date"],
      rowLimit: 5000,
      type: "web",
    });

    const map = new Map<string, any>();

    const gaRows = Array.isArray(ga?.rows) ? ga.rows : [];
    for (const r of gaRows) {
      const d = r?.dimensionValues?.[0]?.value || "";
      map.set(d, { date: d, sessions: Number(r?.metricValues?.[0]?.value || 0) });
    }

    const gscRows = Array.isArray(gsc?.rows) ? gsc.rows : [];
    for (const r of gscRows) {
      const d = r?.keys?.[0] || "";
      const row = map.get(d) || { date: d };
      row.clicks = Number(r?.clicks || 0);
      row.impressions = Number(r?.impressions || 0);
      row.ctr = Number(r?.ctr || 0);
      row.position = Number(r?.position || 0);
      map.set(d, row);
    }

    const series = Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
    return res.status(200).json({ series });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Unexpected error" });
  }
}
