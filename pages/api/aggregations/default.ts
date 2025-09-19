// pages/api/aggregations/default.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getAccessToken, gaRunReport, gscTimeseries } from "@/lib/google";

type GaRow = { date: string; sessions: number; activeUsers?: number };
type GscRow = { date: string; clicks: number; impressions: number; ctr: number; position: number };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { propertyId, siteUrl, start, end } = req.query as Record<string, string>;
    if (!start || !end) return res.status(400).json({ error: "start and end are required" });

    // 1) Get Google access token from NextAuth session
    const token = await getAccessToken(req); // ← NOTE: single-arg version

    const wantGA = !!propertyId;
    const wantGSC = !!siteUrl;

    const [ga, gsc] = await Promise.all([
      wantGA
        ? gaRunReport(token, String(propertyId), {
            dimensions: [{ name: "date" }],
            metrics: [{ name: "sessions" }, { name: "activeUsers" }],
            dateRanges: [{ startDate: String(start), endDate: String(end) }],
          })
        : Promise.resolve([] as GaRow[]),

      wantGSC
        ? gscTimeseries({ req, siteUrl: String(siteUrl), start: String(start), end: String(end) })
        : Promise.resolve({ rows: [] as GscRow[] }),
    ]);

    // gscTimeseries returns { rows }, normalize:
    const gscRows: GscRow[] = Array.isArray((gsc as any)?.rows) ? (gsc as any).rows : (gsc as any);

    res.status(200).json({ ga, gsc: gscRows });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Aggregation failed" });
  }
}
