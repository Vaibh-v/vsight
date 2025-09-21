// pages/api/google/gsc/top-queries.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { gscTopQueries } from "@/lib/google";

type SortBy = "clicks" | "impressions" | "ctr" | "position";
type SortDir = "asc" | "desc";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { siteUrl, start, end, limit, sortBy, sortDir } = req.query;

    if (!siteUrl || !start || !end) {
      return res.status(400).json({ error: "Missing siteUrl/start/end" });
    }

    const { rows } = await gscTopQueries(
      req,
      String(siteUrl),
      String(start),
      String(end),
      {
        rowLimit: limit ? Number(limit) : 250,
        sortBy: (sortBy as SortBy) || "clicks",
        sortDir: (sortDir as SortDir) || "desc",
      }
    );

    // `raw` no longer exists on the return type; only return rows.
    return res.status(200).json({ ok: true, rows });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || "Failed to fetch top queries" });
  }
}
