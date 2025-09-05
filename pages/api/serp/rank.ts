import type { NextApiRequest, NextApiResponse } from "next";
import { serpRanks } from "../../../lib/serp";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
    const { keywords, country, region } = req.body || {};
    if (!Array.isArray(keywords) || !keywords.length) return res.status(400).json({ ok: false, error: "MISSING_KEYWORDS" });
    const data = await serpRanks({ keywords, country, region });
    res.json({ ok: true, data });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message || "UNKNOWN" });
  }
}
