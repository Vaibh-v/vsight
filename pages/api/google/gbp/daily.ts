// pages/api/google/gbp/daily.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const { location, startDate, endDate, metrics } = req.query;
    if (!location || !startDate || !endDate || !metrics) {
      return res.status(400).json({ error: "location, startDate, endDate, metrics are required" });
    }

    // GBP Performance API (requires business.manage scope)
    const url =
      `https://businessprofileperformance.googleapis.com/v1/${encodeURIComponent(
        String(location)
      )}:fetchMultiDailyMetricsTimeSeries?dailyRange.startDate.year=${startDate.toString().slice(0,4)}` +
      `&dailyRange.startDate.month=${startDate.toString().slice(5,7)}` +
      `&dailyRange.startDate.day=${startDate.toString().slice(8,10)}` +
      `&dailyRange.endDate.year=${endDate.toString().slice(0,4)}` +
      `&dailyRange.endDate.month=${endDate.toString().slice(5,7)}` +
      `&dailyRange.endDate.day=${endDate.toString().slice(8,10)}` +
      `&dailyMetrics=${encodeURIComponent(String(metrics))}`;

    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });

    const text = await r.text();
    if (text.trim().startsWith("<")) {
      // helpful error when API isn’t enabled
      return res.status(502).json({
        error: "GBP Performance API returned non-JSON (HTML). Enable the API and verify access.",
        bodyStart: text.slice(0, 120),
      });
    }
    if (!r.ok) return res.status(r.status).json({ error: text });

    const data = text ? JSON.parse(text) : {};
    return res.status(200).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Unexpected error" });
  }
}
