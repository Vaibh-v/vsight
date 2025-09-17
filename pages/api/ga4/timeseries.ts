// /pages/api/ga4/timeseries.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getAccessToken, forwardJsonOrText } from "../../../lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { propertyId, start, end } =
      req.method === "POST" ? req.body : req.query;

    if (!propertyId) return res.status(400).json({ error: "propertyId required" });
    if (!start || !end) return res.status(400).json({ error: "start and end required (YYYY-MM-DD)" });

    const token = await getAccessToken(req, res);
    const url = `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`;
    const body = {
      dateRanges: [{ startDate: String(start), endDate: String(end) }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      dimensions: [{ name: "date" }],
    };

    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await forwardJsonOrText(r);
    const rows = (data as any).rows?.map((row: any) => ({
      date: row.dimensionValues?.[0]?.value ?? "",
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
      activeUsers: Number(row.metricValues?.[1]?.value ?? 0),
    })) ?? [];

    res.status(200).json({ rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "GA4 timeseries failed" });
  }
}
