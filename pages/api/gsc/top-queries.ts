import type { NextApiRequest, NextApiResponse } from "next";
import { gscTopQueries } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { siteUrl, start, end, rowLimit, sortBy, sortDir } = req.query;
    if (!siteUrl || !start || !end) return res.status(400).json({ error: "Missing siteUrl/start/end" });
    const data = await gscTopQueries(req, String(siteUrl), String(start), String(end), {
      rowLimit: Number(rowLimit || 25),
      sortBy: (sortBy as any) || "clicks",
      sortDir: (sortDir as any) || "desc"
    });
    res.status(200).json(data);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "GSC top queries failed" });
  }
}
