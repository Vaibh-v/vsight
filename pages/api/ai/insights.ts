// pages/api/ai/insights.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { gscTimeseries, gscTopQueries } from "@/lib/google";

function getNDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      siteUrl,
      start = getNDaysAgo(28),
      end = getNDaysAgo(1),
      limit,
    } = req.query as Record<string, string>;

    if (!siteUrl) {
      return res.status(400).json({
        ok: false,
        error: { message: "Missing required query param: siteUrl" },
      });
    }

    const rowLimit = limit ? Number(limit) : 25;

    // NOTE: lib/google.ts expects positional args (req, siteUrl, start, end[, rowLimit])
    const [ts, tq] = await Promise.all([
      gscTimeseries(req, String(siteUrl), String(start), String(end)),
      gscTopQueries(req, String(siteUrl), String(start), String(end), rowLimit),
    ]);

    // Lightweight, generic “insights” payload (no LLM call here to keep build green)
    const series = ts.rows ?? [];
    const top = tq.rows ?? [];

    // Basic computed summaries the UI can render immediately
    const totalClicks = series.reduce((acc, r) => acc + (r.clicks || 0), 0);
    const totalImpressions = series.reduce((acc, r) => acc + (r.impressions || 0), 0);
    const avgCtr =
      totalImpressions > 0 ? +(totalClicks / totalImpressions).toFixed(4) : 0;

    const avgPosition =
      series.length > 0
        ? +(
            series.reduce((acc, r) => acc + (r.position || 0), 0) / series.length
          ).toFixed(2)
        : 0;

    res.status(200).json({
      ok: true,
      range: { start, end },
      timeseries: series,
      topQueries: top,
      summary: {
        totalClicks,
        totalImpressions,
        avgCtr,
        avgPosition,
      },
      raw: { timeseries: ts.raw, topQueries: tq.raw },
    });
  } catch (err: any) {
    res
      .status(err?.status ?? 500)
      .json({
        ok: false,
        error: {
          message: err?.message ?? "Failed to build insights",
          details: err?.details ?? null,
        },
      });
  }
}
