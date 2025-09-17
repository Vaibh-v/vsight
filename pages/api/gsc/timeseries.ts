// /pages/api/gsc/timeseries.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getAccessToken, forwardJsonOrText } from "../../../lib/google";

// POST or GET: siteUrl, start, end
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { siteUrl, start, end } =
      req.method === "POST" ? req.body : req.query;

    if (!siteUrl) return res.status(400).json({ error: "siteUrl required" });
    if (!start || !end) return res.status(400).json({ error: "start and end required (YYYY-MM-DD)" });

    const token = await getAccessToken(req, res);
    const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      String(siteUrl)
    )}/searchAnalytics/query`;

    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: String(start),
        endDate: String(end),
        dimensions: ["date"],
        rowLimit: 1000,
      }),
    });

    const data = await forwardJsonOrText(r);
    const rows =
      (data as any).rows?.map((x: any) => ({
        date: x.keys?.[0],
        clicks: x.clicks ?? 0,
        impressions: x.impressions ?? 0,
      })) ?? [];

    res.status(200).json({ rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "GSC timeseries failed" });
  }
}
