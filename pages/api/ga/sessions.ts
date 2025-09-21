import type { NextApiRequest, NextApiResponse } from "next";
import { gaRunReport } from "@/lib/google";
import { getToken } from "next-auth/jwt";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { propertyId, start, end } = req.query;
    if (!propertyId || !start || !end) return res.status(400).json({ error: "Missing propertyId/start/end" });

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const accessToken = (token as any)?.access_token as string | undefined;
    if (!accessToken) return res.status(401).json({ error: "No Google token" });

    const rep = await gaRunReport(String(accessToken), String(propertyId), {
      dimensions: [{ name: "date" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      dateRanges: [{ startDate: String(start), endDate: String(end) }]
    });

    const dimHeaders = rep.dimensionHeaders?.map((d: any) => d.name) || [];
    const metHeaders = rep.metricHeaders?.map((m: any) => m.name) || [];
    const rows = (rep.rows || []).map((r: any) => {
      const row: any = {};
      dimHeaders.forEach((h: string, i: number) => { row[h] = r.dimensionValues?.[i]?.value; });
      metHeaders.forEach((h: string, i: number) => { row[h] = Number(r.metricValues?.[i]?.value || 0); });
      return row;
    });

    res.status(200).json({ rows });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "GA sessions failed" });
  }
}
