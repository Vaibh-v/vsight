import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gaRunReport } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { propertyId, start, end } = req.query as any;
    if (!propertyId || !start || !end) return res.status(400).json({ error: "Missing propertyId/start/end" });

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const rows = await gaRunReport(String(token.access_token), String(propertyId), {
      dimensions: [{ name: "date" }],
      metrics: [{ name: "sessions" }],
      dateRanges: [{ startDate: start, endDate: end }]
    });

    res.status(200).json({ rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Server error" });
  }
}
