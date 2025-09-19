// pages/api/ai/insights.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { gscTopQueries, gscTimeseries } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { siteUrl, start, end } = req.query as Record<string, string>;
    if (!siteUrl || !start || !end) {
      return res.status(400).json({ error: "siteUrl, start, end are required" });
    }

    const [ts, tq] = await Promise.all([
      gscTimeseries({ req, siteUrl, start, end }),
      gscTopQueries({ req, siteUrl, start, end, rowLimit: 25, sortBy: "clicks", sortDir: "desc" }),
    ]);

    const rows = (ts?.rows ?? []) as Array<{ date: string; clicks: number; impressions: number; ctr: number; position: number }>;
    const queries = (tq?.rows ?? []) as Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;

    const insights: { type: string; text: string }[] = [];
    if (rows.length >= 7) {
      const recent = rows.slice(-7);
      const first = recent[0];
      const last = recent[recent.length - 1];
      const deltaClicks = (last.clicks ?? 0) - (first.clicks ?? 0);
      const pct = first.clicks ? (deltaClicks / first.clicks) * 100 : 0;
      insights.push({
        type: "Trend",
        text: `Clicks ${pct >= 0 ? "up" : "down"} ${Math.abs(pct).toFixed(1)}% over the last 7 days.`,
      });
    }

    if (queries.length) {
      const winner = queries[0];
      insights.push({
        type: "Top Query",
        text: `“${winner.query}” drives the most clicks (${winner.clicks}). Consider building supporting content.`,
      });

      const lowCTR = [...queries].sort((a, b) => a.ctr - b.ctr)[0];
      if (lowCTR) {
        insights.push({
          type: "CTR Opportunity",
          text: `Low CTR on “${lowCTR.query}” (${(lowCTR.ctr * 100).toFixed(1)}%). Optimize title/description.`,
        });
      }
    }

    res.status(200).json({ insights, raw: { timeseries: rows.length, queries: queries.length } });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to generate insights" });
  }
}
