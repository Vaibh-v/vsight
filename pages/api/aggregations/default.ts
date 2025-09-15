import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gaRunReport, gscTimeseriesClicks } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const { propertyId, siteUrl, start, end } = req.query as {
      propertyId?: string;
      siteUrl?: string;
      start?: string;
      end?: string;
    };

    const wantGA = Boolean(propertyId);
    const wantGSC = Boolean(siteUrl);

    const [ga, gsc] = await Promise.all([
      wantGA
        ? gaRunReport(String(token.access_token), String(propertyId), {
            dimensions: ["date"],
            metrics: ["sessions"],
            dateRanges: [{ startDate: String(start), endDate: String(end) }],
          })
        : Promise.resolve({ rows: [] }),
      wantGSC
        ? gscTimeseriesClicks(String(token.access_token), String(siteUrl), {
            startDate: String(start),
            endDate: String(end),
          })
        : Promise.resolve([]),
    ]);

    // Normalize to a single array your front-end can render.
    const out: Array<
      { date: string; clicks: number; impressions: number; ctr: number; position: number }
    > = [];

    // GA rows come as { date: "YYYY-MM-DD", sessions: number }
    if (Array.isArray(ga.rows)) {
      for (const r of ga.rows) {
        if (r.date) {
          out.push({
            date: r.date,
            clicks: Number(r.sessions || 0), // map sessions -> clicks placeholder for unified chart
            impressions: 0,
            ctr: 0,
            position: 0,
          });
        }
      }
    }

    // GSC timeseries: { date, clicks, impressions, ctr, position }
    if (Array.isArray(gsc)) {
      for (const r of gsc) out.push(r);
    }

    return res.status(200).json(out);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
