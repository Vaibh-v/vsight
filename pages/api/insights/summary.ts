import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const rows = (req.body && (req.body as any).rows) || [];
    if (!Array.isArray(rows) || !rows.length) return res.status(200).json({ summary: "" });

    // Tiny heuristic summary (stub)
    const last = rows[rows.length - 1] || {};
    const sessions = Number(last.sessions || 0);
    const clicks = Number(last.clicks || 0);
    const ctrPct = Math.round(Number(last.ctr || 0) * 10000) / 100;
    const summary = `Latest day: ${sessions} sessions, ${clicks} clicks, CTR ${ctrPct}%.`;

    res.status(200).json({ summary });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
