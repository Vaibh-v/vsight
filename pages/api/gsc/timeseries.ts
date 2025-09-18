// pages/api/gsc/timeseries.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { gscTimeseries } from "@/lib/google";

type SeriesPoint = { date: string; clicks: number; impressions: number; ctr: number; position: number };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      siteUrl,
      start,
      end,
      country,     // optional
      device,      // optional
      keywordMode, // optional
      keyword,     // optional
    } = req.query as Record<string, string>;

    if (!siteUrl || !start || !end) {
      return res.status(400).json({ error: "siteUrl, start, end are required" });
    }

    const data = await gscTimeseries({
      req,
      siteUrl,
      start,
      end,
      country: country || undefined,
      device: device || undefined,
      keywordMode: keywordMode || undefined,
      keyword: keyword || undefined,
    });

    const rows: SeriesPoint[] = (data?.rows ?? []).map((r: any) => ({
      date: String(r.date || r.day || ""),
      clicks: Number(r.clicks ?? 0),
      impressions: Number(r.impressions ?? 0),
      ctr: Number(r.ctr ?? 0),
      position: Number(r.position ?? 0),
    }));

    res.status(200).json({ rows, raw: data?.raw ?? null });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch timeseries" });
  }
}
