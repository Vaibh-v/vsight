// /pages/api/gsc/insight.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { gscTimeseries, gscTopQueries } from "@/lib/google";

type GscRow = {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type QueryRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

function pct(a: number, b: number) {
  if (!b) return 0;
  return ((a - b) / b) * 100;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      siteUrl,
      start,
      end,
      rowLimit = 25,
      sortBy = "clicks",
      sortDir = "desc",
    } = (req.body || {}) as {
      siteUrl: string;
      start: string;
      end: string;
      rowLimit?: number;
      sortBy?: "clicks" | "impressions" | "ctr" | "position";
      sortDir?: "asc" | "desc";
    };

    if (!siteUrl || !start || !end) {
      return res.status(400).json({ error: "Missing siteUrl/start/end" });
    }

    const [ts, tq] = await Promise.all([
      gscTimeseries(req, String(siteUrl), String(start), String(end)),
      gscTopQueries(
        req,
        String(siteUrl),
        String(start),
        String(end),
        Number(rowLimit) || 25,
        String(sortBy) as "clicks" | "impressions" | "ctr" | "position",
        String(sortDir) as "asc" | "desc"
      ),
    ]);

    const rows = (ts?.rows || []) as GscRow[];
    const queries = (tq?.rows || []) as QueryRow[];

    // Minimal computed summary (kept here to avoid frontend duplication)
    let summary = "";
    if (rows.length > 1) {
      const first = rows[0];
      const last = rows[rows.length - 1];
      const clickChange = pct(last.clicks, first.clicks);
      const impChange = pct(last.impressions, first.impressions);
      summary = `Clicks ${clickChange >= 0 ? "up" : "down"} ${Math.abs(clickChange).toFixed(
        1
      )}%, impressions ${impChange >= 0 ? "up" : "down"} ${Math.abs(impChange).toFixed(1)}% from ${
        first.date
      } to ${last.date}.`;
    }

    return res.status(200).json({
      siteUrl,
      start,
      end,
      timeseries: rows,
      topQueries: queries,
      summary,
    });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || "Failed to fetch GSC insight" });
  }
}
