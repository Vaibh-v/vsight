import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gscQuery } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { siteUrl, start, end } = req.query as any;
  if (!siteUrl || !start || !end) return res.status(400).json({ error: "Missing siteUrl/start/end" });
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const r = await gscQuery(String(token.access_token), String(siteUrl), {
      startDate: String(start),
      endDate: String(end),
      dimensions: ["query"],
      rowLimit: 10,
      type: "web"
    });
    const rows = (r.rows || []).map(row => ({
      query: row.keys?.[0] || "",
      clicks: Number(row.clicks || 0),
      impressions: Number(row.impressions || 0),
      ctr: Number(row.ctr || 0),
      position: Number(row.position || 0)
    }));
    res.status(200).json({ rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Unexpected error" });
  }
}
