import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { serpRank } from "../../../lib/serp";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { keywords, region, topN, domain } = req.body || {};
    if (!Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: "keywords[] required" });
    }
    const data = await serpRank({
      keywords,
      region: region || { country: "USA" },
      topN: topN || 10,
      domain: domain || undefined,
    });
    res.status(200).json({ data });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "SERP error" });
  }
}
