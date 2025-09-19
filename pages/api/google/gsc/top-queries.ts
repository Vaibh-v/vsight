// pages/api/google/gsc/top-queries.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { gscTopQueries } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { siteUrl, start, end, limit } = req.query as Record<string, string>;
    if (!siteUrl || !start || !end) {
      return res.status(400).json({ ok: false, error: { message: "Missing siteUrl, start, or end" } });
    }
    const rowLimit = limit ? Number(limit) : 250;
    const { rows, raw } = await gscTopQueries(req, siteUrl, start, end, rowLimit);
    res.status(200).json({ ok: true, rows, raw });
  } catch (err: any) {
    res
      .status(err?.status ?? 500)
      .json({ ok: false, error: { message: err?.message ?? "Failed to fetch top queries", details: err?.details ?? null } });
  }
}
