// pages/api/serp/rank.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt"; // keep routes behind auth
import { getSerpRanks, SerpInput } from "../../../lib/serp";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // optional: gate by auth so API keys never leak
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const {
      keywords,
      region,
      topN,
      domain,
      startDate,
      endDate,
      provider,
    } = (req.body || {}) as Partial<SerpInput>;

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: "keywords[] required" });
    }
    if (!region?.country) {
      return res.status(400).json({ error: "region.country required (e.g., 'USA')" });
    }

    const data = await getSerpRanks({
      keywords,
      region: { country: region.country, state: region.state },
      topN: topN ?? 10,
      domain,
      startDate,
      endDate,
      provider,
    });

    res.status(200).json({ data });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
