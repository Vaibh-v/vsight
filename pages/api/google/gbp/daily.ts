import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { location, startDate, endDate, metrics } = req.query;
  const loc = String(location || "");
  if (!loc) return res.status(400).json({ error: "location is required (e.g., locations/12345678901234567890)" });

  const start = String(startDate || "");
  const end = String(endDate || "");
  if (!start || !end) return res.status(400).json({ error: "startDate and endDate are required (YYYY-MM-DD)" });

  const metricList = String(metrics || "BUSINESS_INTERACTIONS_WEBSITE_CLICKS").split(",");

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

  const parse = (d: string) => ({ year: +d.slice(0, 4), month: +d.slice(5, 7), day: +d.slice(8, 10) });

  const body = {
    metrics: metricList.map((m) => ({ metric: m })),
    timeRange: { startDate: parse(start), endDate: parse(end) },
    granularity: "DAILY"
  };

  const url = `https://businessprofileperformance.googleapis.com/v1/${encodeURIComponent(
    loc
  )}:fetchMetricsTimeSeries`;

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const json = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: json.error?.message || "GBP Performance API error", raw: json });
    return res.status(200).json(json);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Unexpected server error" });
  }
}
