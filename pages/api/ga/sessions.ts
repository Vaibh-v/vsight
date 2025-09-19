// pages/api/ga/sessions.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { gaRunReport } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { propertyId, start, end } = req.query;

    if (!propertyId || !start || !end) {
      return res.status(400).json({ error: "Missing propertyId/start/end" });
    }

    const report: any = await gaRunReport(
      req,
      String(propertyId),
      {
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }],
        dateRanges: [{ startDate: String(start), endDate: String(end) }],
      }
    );

    // Normalize rows for the chart
    const rows =
      report?.rows?.map((r: any) => ({
        date: r?.dimensionValues?.[0]?.value ?? "",
        sessions: Number(r?.metricValues?.[0]?.value ?? 0),
      })) ?? [];

    return res.status(200).json({ rows });
  } catch (e: any) {
    return res
      .status(e?.status ?? 500)
      .json({ error: e?.message ?? "GA4 sessions failed" });
  }
}
