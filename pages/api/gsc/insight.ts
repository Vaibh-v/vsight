// pages/api/gsc/insight.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { gscTimeseries, gscTopQueries } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { siteUrl, start, end, rowLimit = 25, sortBy = "clicks", sortDir = "desc" } =
      (req.method === "POST" ? req.body : req.query) as Record<string, any>;

    if (!siteUrl || !start || !end) {
      return res.status(400).json({ error: "Missing siteUrl/start/end" });
    }

    const [ts, tq] = await Promise.all([
      gscTimeseries(req, String(siteUrl), String(start), String(end)),
      gscTopQueries(req, String(siteUrl), String(start), String(end), {
        rowLimit: Number(rowLimit) || 25,
        sortBy: String(sortBy) as "clicks" | "impressions" | "ctr" | "position",
        sortDir: String(sortDir) as "asc" | "desc",
      }),
    ]);

    return res.status(200).json({
      timeseries: ts?.rows ?? [],
      topQueries: tq?.rows ?? [],
    });
  } catch (e: any) {
    return res.status(e?.status || 500).json({
      error: e?.message || "Failed to build GSC insight",
    });
  }
}
