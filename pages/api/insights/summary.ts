// pages/api/insights/summary.ts
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Input shape:
 * POST { rows: Array<{ date: string; sessions?: number; clicks?: number; ctr?: number; impressions?: number }> }
 * Returns: { summary: string }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // ---- Parse body safely (NextApiRequest has no req.json()) ----
    let body: any = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const rows = Array.isArray(body?.rows) ? body.rows as Array<any> : [];
    if (!rows.length) {
      return res.status(200).json({ summary: "" });
    }

    // ---- Normalize and sort by date ----
    const data = rows
      .map(r => ({
        date: String(r.date),
        sessions: Number(r.sessions ?? 0),
        clicks: Number(r.clicks ?? 0),
        impressions: Number(r.impressions ?? 0),
        ctr: typeof r.ctr === "number" ? r.ctr : (
          Number(r.clicks ?? 0) && Number(r.impressions ?? 0)
            ? Number(r.clicks ?? 0) / Number(r.impressions ?? 0)
            : 0
        ),
      }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    const startDate = data[0]?.date;
    const endDate = data[data.length - 1]?.date;

    // Totals
    const totalSessions = data.reduce((s, r) => s + r.sessions, 0);
    const totalClicks = data.reduce((s, r) => s + r.clicks, 0);
    const totalImpr = data.reduce((s, r) => s + r.impressions, 0);
    const avgCtr = totalImpr ? totalClicks / totalImpr : 0;

    // Trend (first 7 vs last 7)
    const head = data.slice(0, Math.min(7, data.length));
    const tail = data.slice(-Math.min(7, data.length));

    function sum(arr: typeof data, key: keyof typeof data[number]) {
      return arr.reduce((s, r) => s + Number(r[key] ?? 0), 0);
    }
    const s1 = sum(head, "sessions");
    const s2 = sum(tail, "sessions");
    const c1 = sum(head, "clicks");
    const c2 = sum(tail, "clicks");

    const pct = (a: number, b: number) => (a ? ((b - a) / a) * 100 : (b ? 100 : 0));
    const sessionsTrendPct = pct(s1, s2);
    const clicksTrendPct = pct(c1, c2);

    // Nicely format %
    const fmtPct = (v: number) => `${(Math.round(v * 100) / 100).toFixed(2)}%`;
    const fmt = (n: number) => Intl.NumberFormat("en-US").format(n);

    const trendWord = (v: number) => (v > 2 ? "up" : v < -2 ? "down" : "flat");

    const summary =
      `From ${startDate} to ${endDate}: ` +
      `sessions ${trendWord(sessionsTrendPct)} ${fmtPct(sessionsTrendPct/100)}, ` +
      `clicks ${trendWord(clicksTrendPct)} ${fmtPct(clicksTrendPct/100)}. ` +
      `Totals — Sessions: ${fmt(totalSessions)}, Clicks: ${fmt(totalClicks)}, ` +
      `Impressions: ${fmt(totalImpr)}, Avg CTR: ${fmtPct(avgCtr)}.`;

    return res.status(200).json({ summary });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
