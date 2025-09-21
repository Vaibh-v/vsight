import type { NextApiRequest, NextApiResponse } from "next";
import { gscTimeseries, gscTopQueries } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { siteUrl, start, end, rowLimit, sortBy, sortDir } = req.query;
    if (!siteUrl || !start || !end) return res.status(400).json({ error: "Missing siteUrl/start/end" });

    const [ts, tq] = await Promise.all([
      gscTimeseries(req, String(siteUrl), String(start), String(end)),
      gscTopQueries(req, String(siteUrl), String(start), String(end), {
        rowLimit: Number(rowLimit || 25),
        sortBy: (sortBy as any) || "clicks",
        sortDir: (sortDir as any) || "desc"
      })
    ]);

    const prompt = `You are an SEO analyst. Using the daily trends and top queries below, write 5 concise, actionable bullets.
Timeseries: ${JSON.stringify(ts.rows.slice(-14))}
TopQueries: ${JSON.stringify(tq.rows.slice(0, 15))}`;

    res.status(200).json({ insights: [`(placeholder) ${prompt.slice(0, 500)}...`] });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "AI insights failed" });
  }
}
