import type { NextApiRequest, NextApiResponse } from "next";
import { forwardJsonOrText, gscTimeseries, gscTopQueries } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const isPost = req.method === "POST";
    const payload = isPost ? req.body || {} : req.query;
    const siteUrl = String(payload.siteUrl || "");
    const start = String(payload.start || "");
    const end = String(payload.end || "");
    if (!siteUrl || !start || !end) return res.status(400).json({ error: "Missing siteUrl/start/end" });

    const [ts, tq] = await Promise.all([
      gscTimeseries(req, siteUrl, start, end),
      gscTopQueries(req, siteUrl, start, end, { rowLimit: 25, sortBy: "clicks", sortDir: "desc" })
    ]);

    // naive LLM prompt – replace later with your own model/gateway
    const prompt = `You are an SEO analyst. Using the daily trends and top queries below, write 3-5 bullet insights.
Timeseries: ${JSON.stringify(ts.rows.slice(-14))}
TopQueries: ${JSON.stringify(tq.rows.slice(0, 10))}`;

    // For now just echo the prompt back as "insight" placeholder
    res.status(200).json({ insights: [`(placeholder) ${prompt.slice(0, 400)}...`] });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "GSC insight failed" });
  }
}
