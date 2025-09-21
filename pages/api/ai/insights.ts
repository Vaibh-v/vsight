// /pages/api/ai/insights.ts
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

function avg(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
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

    // Heuristic insights (no external LLM dependency)
    const insights: string[] = [];
    if (rows.length > 1) {
      const clicks = rows.map((r) => r.clicks || 0);
      const impr = rows.map((r) => r.impressions || 0);
      const ctrs = rows.map((r) => r.ctr || 0);
      const pos = rows.map((r) => r.position || 0);

      const last = rows[rows.length - 1];
      const first = rows[0];
      const clickChange = pct(last.clicks, first.clicks);
      const impChange = pct(last.impressions, first.impressions);

      const win = Math.min(7, rows.length >> 1);
      const recentAvg = avg(clicks.slice(-win));
      const priorAvg = avg(clicks.slice(-(2 * win), -win));
      const momentum = pct(recentAvg, priorAvg);

      insights.push(
        `Clicks changed ${clickChange.toFixed(1)}% from ${first.date} to ${last.date}.`,
        `Impressions changed ${impChange.toFixed(1)}% over the same period.`,
        `Recent ${win}-day average clicks are ${momentum >= 0 ? "up" : "down"} ${Math.abs(momentum).toFixed(1)}% vs the prior ${win} days.`,
        `Average CTR: ${avg(ctrs).toFixed(2)}%. Average position: ${avg(pos).toFixed(1)}.`
      );
    }

    const topByClicks = [...queries]
      .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
      .slice(0, 5)
      .map((q) => `${q.query} (${q.clicks} clicks)`);

    if (topByClicks.length) {
      insights.push(`Top queries by clicks: ${topByClicks.join(", ")}.`);
    }

    return res.status(200).json({
      siteUrl,
      start,
      end,
      timeseries: rows,
      topQueries: queries,
      insights,
    });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || "Failed to build insights" });
  }
}
