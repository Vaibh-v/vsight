import type { NextApiRequest, NextApiResponse } from "next";
import { gscTimeseries } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { siteUrl, start, end } = req.query;
    if (!siteUrl || !start || !end) return res.status(400).json({ error: "Missing siteUrl/start/end" });
    const data = await gscTimeseries(req, String(siteUrl), String(start), String(end));
    res.status(200).json(data);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "GSC timeseries failed" });
  }
}
