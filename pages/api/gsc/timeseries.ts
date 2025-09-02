import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gscTimeseriesClicks } from "../../../lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { siteUrl, start, end } = req.query as any;
    if (!siteUrl || !start || !end) return res.status(400).json({ error: "Missing siteUrl/start/end" });
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });
    const data = await gscTimeseriesClicks(token.access_token as string, siteUrl, start, end);
    res.status(200).json({ data });
  } catch (e: any) { res.status(500).json({ error: e.message || "Server error" }); }
}
