import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gscQuery } from "../../../lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { siteUrl, start, end, limit } = req.query as any;
    if (!siteUrl || !start || !end) return res.status(400).json({ error: "Missing siteUrl/start/end" });
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });
    const j = await gscQuery(token.access_token as string, siteUrl, { startDate: start, endDate: end, dimensions: ["query"], rowLimit: Number(limit ?? 1000) });
    const rows = (j.rows ?? []).map((r: any) => ({ query: r.keys?.[0] ?? "", clicks: r.clicks ?? 0, impressions: r.impressions ?? 0, ctr: r.ctr ?? 0, position: r.position ?? 99 }))
      .filter((r: any) => r.position <= 10).sort((a: any, b: any) => a.position - b.position).slice(0, 200);
    res.status(200).json({ rows });
  } catch (e: any) { res.status(500).json({ error: e.message || "Server error" }); }
}
