import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gscTimeseries } from "@/lib/google"; // canonical name (aliases also exist)

/**
 * GET /api/gsc/timeseries?siteUrl=...&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Returns daily clicks/impressions/ctr/position for the period.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const { siteUrl, startDate, endDate } = req.query as {
      siteUrl?: string;
      startDate?: string;
      endDate?: string;
    };

    if (!siteUrl || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing siteUrl/startDate/endDate" });
    }

    const accessToken = String(token.access_token);

    // lib returns an array of rows with keys + metrics
    const rows = await gscTimeseries(accessToken, siteUrl, {
      startDate,
      endDate,
      type: "web",
    });

    // normalize to { date, clicks, impressions, ctr, position }
    const data = (Array.isArray(rows) ? rows : []).map((r: any) => ({
      date: r?.keys?.[0] || "",
      clicks: Number(r?.clicks ?? 0),
      impressions: Number(r?.impressions ?? 0),
      ctr: Number(r?.ctr ?? 0),
      position: Number(r?.position ?? 0),
    }));

    return res.status(200).json({ data });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
