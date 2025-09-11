import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gscTopQueries } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const siteUrl = String(req.query.siteUrl || "");
    const start = String(req.query.start || "");
    const end = String(req.query.end || "");
    const limit = req.query.limit ? Number(req.query.limit) : 1000;
    if (!siteUrl || !start || !end) {
      return res.status(400).json({ error: "Missing siteUrl/start/end" });
    }

    const data = await gscTopQueries(String(token.access_token), siteUrl, {
      startDate: start,
      endDate: end,
      rowLimit: limit,
      // tolerate older callers that pass extras
      dimensions: ["query"],
      type: "web",
    });

    return res.status(200).json({ rows: data.rows });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
