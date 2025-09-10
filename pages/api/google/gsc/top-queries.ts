import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gscTopQueries } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const { siteUrl, start, end, limit, searchType } = req.query as {
      siteUrl?: string;
      start?: string;
      end?: string;
      limit?: string;
      searchType?: "web" | "image" | "video" | "news" | "discover" | "googleNews";
    };

    if (!siteUrl || !start || !end) {
      return res.status(400).json({ error: "Missing siteUrl, start, or end" });
    }

    const data = await gscTopQueries(token.access_token as string, siteUrl, {
      startDate: start,
      endDate: end,
      rowLimit: limit ? Number(limit) : 1000,
      searchType: (searchType as any) || "web",
    });

    const rows = (data?.rows || []).map((r: any) => ({
      query: r?.keys?.[0] || "",
      clicks: Number(r?.clicks || 0),
      impressions: Number(r?.impressions || 0),
      ctr: Number(r?.ctr || 0), // fraction 0..1
      position: Number(r?.position || 0),
    }));

    return res.status(200).json({ rows });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Unexpected error" });
  }
}
