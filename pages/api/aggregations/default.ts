// pages/api/aggregations/default.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { gaRunReport, gscTimeseries } from "@/lib/google";

type GaRow = { date?: string; sessions?: number; activeUsers?: number; [k: string]: any };
type GscRow = { date: string; clicks: number; impressions: number; ctr: number; position: number };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      propertyId,
      siteUrl,
      start = getNDaysAgo(28),
      end = getNDaysAgo(1),
      wantGA = "true",
      wantGSC = "true",
    } = req.query as Record<string, string>;

    const wantGAFlag = wantGA !== "false" && !!propertyId;
    const wantGSCFlag = wantGSC !== "false" && !!siteUrl;

    const [ga, gsc] = await Promise.all([
      wantGAFlag
        ? gaRunReport(req, String(propertyId), {
            dimensions: [{ name: "date" }],
            metrics: [{ name: "sessions" }, { name: "activeUsers" }],
            dateRanges: [{ startDate: String(start), endDate: String(end) }],
            orderBys: [{ dimension: { dimensionName: "date" } }],
          })
        : Promise.resolve({ rows: [] as GaRow[], raw: null }),
      wantGSCFlag
        ? gscTimeseries(req, String(siteUrl), String(start), String(end))
        : Promise.resolve({ rows: [] as GscRow[], raw: null }),
    ]);

    // Normalize GA date key to YYYY-MM-DD if it's YYYYMMDD
    const gaRows: GaRow[] = (ga.rows as any[]).map((r) => {
      const date = r.date;
      if (date && /^\d{8}$/.test(date)) {
        return { ...r, date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}` };
      }
      return r;
    });

    res.status(200).json({
      ok: true,
      range: { start, end },
      ga: { rows: gaRows, raw: ga.raw },
      gsc: { rows: gsc.rows, raw: gsc.raw },
    });
  } catch (err: any) {
    const status = err?.status ?? 500;
    res.status(status).json({
      ok: false,
      error: { message: err?.message ?? "Unexpected error", details: err?.details ?? null },
    });
  }
}

function getNDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
