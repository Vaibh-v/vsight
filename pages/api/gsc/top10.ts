import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gscTopQueries } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const { siteUrl, start, end } = req.query as any;
    if (!siteUrl || !start || !end) return res.status(400).json({ error: "Missing siteUrl/start/end" });

    const rows = await gscTopQueries(String(token.access_token), String(siteUrl), String(start), String(end), 10);
    res.status(200).json({ rows });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
