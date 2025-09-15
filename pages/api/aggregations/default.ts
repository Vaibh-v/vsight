// pages/api/aggregations/default.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gaRunReport, gscTimeseriesClicks } from "@/lib/google";

type GaPoint = { date: string; sessions: number };
type GscPoint = { date: string; clicks: number; impressions: number; ctr: number; position: number };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const accessToken = String(token?.access_token || "");
    if (!accessToken) return res.status(401).json({ error: "Not authenticated" });

    const { propertyId, siteUrl, startDate, endDate } = req.query as any;
    const end = String(endDate || new Date().toISOString().slice(0, 10));
    const start =
      String(startDate) ||
      new Date(Date.now() - 27 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const wantGA = !!propertyId;
    const wantGSC = !!siteUrl;

    const [ga, gsc] = await Promise.all([
      wantGA
        ? gaRunReport(accessToken, String(propertyId), {
            dimensions: ["date"], // our lib accepts string[] OR {name}[]
            metrics: ["sessions"],
            dateRanges: [{ startDate: start, endDate: end }],
          })
        : Promise.resolve<{ rows: GaPoint[] }>({ rows: [] }),
      wantGSC
        ? gscTimeseriesClicks(accessToken, String(siteUrl), { startDate: start, endDate: end })
        : Promise.resolve<{ rows: GscPoint[] }>({ rows: [] }),
    ]);

    return res.status(200).json({
      ga: ga?.rows ?? [],
      gsc: gsc?.rows ?? [],
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
