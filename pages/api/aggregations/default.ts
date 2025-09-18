// pages/api/aggregations/default.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { gaRunReport, gscTimeseries } from "@/lib/google";

type GaRow = { date: string; sessions: number; activeUsers: number };
type GscRow = { date: string; clicks: number; impressions: number; ctr: number; position: number };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      propertyId, // GA4 property id (optional)
      siteUrl,    // GSC siteUrl (optional)
      start,
      end,
    } = req.query as Record<string, string>;

    if (!start || !end) {
      return res.status(400).json({ error: "start and end are required" });
    }

    const wantGA = Boolean(propertyId);
    const wantGSC = Boolean(siteUrl);

    const [ga, gsc] = await Promise.all([
      wantGA
        ? gaRunReport(req, String(propertyId), {
            dimensions: [{ name: "date" }],
            metrics: [{ name: "sessions" }, { name: "activeUsers" }],
            dateRanges: [{ startDate: String(start), endDate: String(end) }],
          })
        : null,
      wantGSC
        ? gscTimeseries({ req, siteUrl: String(siteUrl), start: String(start), end: String(end) })
        : null,
    ]);

    const gaRows: GaRow[] = Array.isArray(ga?.rows)
      ? ga.rows.map((r: any) => ({
          date: String(r.date),
          sessions: Number(r.sessions ?? 0),
          activeUsers: Number(r.activeUsers ?? 0),
        }))
      : [];

    const gscRows: GscRow[] = Array.isArray(gsc?.rows)
      ? gsc.rows.map((r: any) => ({
          date: String(r.date),
          clicks: Number(r.clicks ?? 0),
          impressions: Number(r.impressions ?? 0),
          ctr: Number(r.ctr ?? 0),
          position: Number(r.position ?? 0),
        }))
      : [];

    res.status(200).json({ ga: gaRows, gsc: gscRows, raw: { ga: ga?.raw ?? null, gsc: gsc?.raw ?? null } });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to run dashboard aggregation" });
  }
}
