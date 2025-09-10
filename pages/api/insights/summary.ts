import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const rows = Array.isArray((req.body as any)?.rows) ? (req.body as any).rows : [];
    if (!rows.length) return res.status(200).json({ summary: "" });

    // Placeholder “insight” until you wire your LLM key – avoids build/runtime errors.
    const first = rows[0], last = rows[rows.length - 1];
    const sessionsDelta = (last.sessions ?? 0) - (first.sessions ?? 0);
    const clicksDelta = (last.clicks ?? 0) - (first.clicks ?? 0);

    const summary = `In this period, sessions changed by ${sessionsDelta} and clicks changed by ${clicksDelta}.`;
    res.status(200).json({ summary });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Server error" });
  }
}
