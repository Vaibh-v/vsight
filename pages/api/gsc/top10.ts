// pages/api/gsc/top10.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gscTopQueries } from "@/lib/google";

type GscApiRow = {
  keys?: string[];          // ["keyword"]
  clicks?: number;
  impressions?: number;
  ctr?: number;             // 0..1
  position?: number;
};

type OutRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;              // 0..1
  position: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const { siteUrl, start, end, limit } = req.query as {
      siteUrl?: string;
      start?: string;
      end?: string;
      limit?: string;
    };

    if (!siteUrl || !start || !end) {
      return res.status(400).json({ error: "Missing siteUrl, start, or end" });
    }

    const data = await gscTopQueries(token.access_token as string, siteUrl, {
      startDate: start,
      endDate: end,
      rowLimit: limit ? Number(limit) : 1000,
      searchType: "web",
    });

    const rows: OutRow[] = ((data?.rows as GscApiRow[]) || []).map((row: GscApiRow): OutRow => ({
      query: row?.keys?.[0] ?? "",
      clicks: Number(row?.clicks ?? 0),
      impressions: Number(row?.impressions ?? 0),
      ctr: Number(row?.ctr ?? 0),
      position: Number(row?.position ?? 0),
    }));

    // Top 10 by clicks (you can change the sort to impressions/ctr/position if you prefer)
    rows.sort((a, b) => b.clicks - a.clicks);
    const top10 = rows.slice(0, 10);

    return res.status(200).json({ rows: top10 });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Unexpected error" });
  }
}
