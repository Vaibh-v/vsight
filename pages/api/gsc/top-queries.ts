// pages/api/gsc/top-queries.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { gscTopQueries } from "@/lib/google";

type Row = { query: string; clicks: number; impressions: number; ctr: number; position: number };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      siteUrl,
      start,
      end,
      country,           // optional
      device,            // optional
      keywordMode,       // "contains" | "equals" (optional)
      keyword,           // optional
      rowLimit = 25,
      sortBy = "clicks", // "clicks" | "impressions" | "ctr" | "position"
      sortDir = "desc",  // "asc" | "desc"
    } = req.query as Record<string, string>;

    if (!siteUrl || !start || !end) {
      return res.status(400).json({ error: "siteUrl, start, end are required" });
    }

    const data = await gscTopQueries({
      req,
      siteUrl,
      start,
      end,
      rowLimit: Number(rowLimit) || 25,
      country: country || undefined,
      device: device || undefined,
      keywordMode: keywordMode || undefined,
      keyword: keyword || undefined,
      sortBy: sortBy || "clicks",
      sortDir: sortDir || "desc",
    });

    // Ensure a stable shape
    const rows: Row[] = (data?.rows ?? []).map((r: any) => ({
      query: r.query ?? "",
      clicks: Number(r.clicks ?? 0),
      impressions: Number(r.impressions ?? 0),
      ctr: Number(r.ctr ?? 0),
      position: Number(r.position ?? 0),
    }));

    res.status(200).json({ rows, raw: data?.raw ?? null });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch top queries" });
  }
}
