import type { NextApiRequest, NextApiResponse } from "next";
import { gaRunReport, gscTimeseries } from "@/lib/google";
import { getToken } from "next-auth/jwt";

type GaRow = { date: string; sessions: number; activeUsers?: number };
type GscRow = { date: string; clicks: number; impressions: number; ctr: number; position: number };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { siteUrl, propertyId, start, end, wantGA = "1", wantGSC = "1" } = req.query;

    const [ga, gsc] = await Promise.all([
      wantGA ? (async () => {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        const access = (token as any)?.access_token as string | undefined;
        if (!access || !propertyId) return { rows: [] as GaRow[] };
        const rep = await gaRunReport(access, String(propertyId), {
          dimensions: [{ name: "date" }],
          metrics: [{ name: "sessions" }, { name: "activeUsers" }],
          dateRanges: [{ startDate: String(start), endDate: String(end) }]
        });
        const dimHeaders = rep.dimensionHeaders?.map((d: any) => d.name) || [];
        const metHeaders = rep.metricHeaders?.map((m: any) => m.name) || [];
        const rows = (rep.rows || []).map((r: any) => {
          const row: any = {};
          dimHeaders.forEach((h: string, i: number) => { row[h] = r.dimensionValues?.[i]?.value; });
          metHeaders.forEach((h: string, i: number) => { row[h] = Number(r.metricValues?.[i]?.value || 0); });
          return { date: row.date, sessions: row.sessions, activeUsers: row.activeUsers } as GaRow;
        });
        return { rows };
      })() : Promise.resolve({ rows: [] as GaRow[] }),

      wantGSC ? (async () => {
        if (!siteUrl) return { rows: [] as GscRow[] };
        const ts = await gscTimeseries(req, String(siteUrl), String(start), String(end));
        return ts;
      })() : Promise.resolve({ rows: [] as GscRow[] })
    ]);

    res.status(200).json({ ga, gsc });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Aggregation failed" });
  }
}
