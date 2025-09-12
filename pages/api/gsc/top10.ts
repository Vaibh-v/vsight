import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gscTopQueries } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { siteUrl, start: startDate, end: endDate } = (req.query || {}) as Record<string, string>;
    if (!siteUrl || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing siteUrl/start/end" });
    }

    // NEW: pass a single options object instead of 5 args
    const data = await gscTopQueries(String(token.access_token), String(siteUrl), {
      startDate: String(startDate),
      endDate: String(endDate),
      rowLimit: 10,
      type: "web",
    });

    const raw = Array.isArray((data as any)?.rows) ? (data as any).rows : [];
    const rows = raw.map((r: any) => ({
      query: r?.keys?.[0] ?? "",
      clicks: Number(r?.clicks ?? 0),
      impressions: Number(r?.impressions ?? 0),
      ctr: Number(r?.ctr ?? 0),
      position: Number(r?.position ?? 0),
    }));

    return res.status(200).json({ rows });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
