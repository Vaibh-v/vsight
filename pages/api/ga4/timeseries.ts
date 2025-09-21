import type { NextApiRequest, NextApiResponse } from "next";
import { forwardJsonOrText, getAccessToken } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getAccessToken(req);
    const { propertyId, start, end } = req.query;
    if (!propertyId || !start || !end) return res.status(400).json({ error: "Missing propertyId/start/end" });

    const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
    const body = {
      dimensions: [{ name: "date" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      dateRanges: [{ startDate: String(start), endDate: String(end) }]
    };
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await forwardJsonOrText(r);
    res.status(200).json(data);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "GA4 timeseries failed" });
  }
}
