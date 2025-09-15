// pages/api/google/gsc/top-queries.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gscTopQueries } from "@/lib/google";

/**
 * GET /api/google/gsc/top-queries
 * Query params:
 *   siteUrl (required)
 *   start, end (ISO, optional; defaults last 28d)
 *   limit OR rowLimit (optional; number; defaults 10)
 * Returns: { rows: Array<{ query, clicks, impressions, ctr, position, page? }> }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const accessToken = String(token?.access_token || "");
    if (!accessToken) return res.status(401).json({ error: "Not authenticated" });

    const siteUrl = String(req.query.siteUrl || "");
    if (!siteUrl) return res.status(400).json({ error: "Missing siteUrl" });

    const startParam = String(req.query.start || "");
    const endParam = String(req.query.end || "");

    // Accept both ?limit= and legacy ?rowLimit=
    const limRaw = (req.query.limit ?? req.query.rowLimit) as string | string[] | undefined;
    const limit = Number(Array.isArray(limRaw) ? limRaw[0] : limRaw) || 10;

    // Defaults: last 28 days if dates not provided
    const endDate = endParam || new Date().toISOString().slice(0, 10);
    const startDate =
      startParam ||
      new Date(Date.now() - 27 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const { rows } = await gscTopQueries(accessToken, siteUrl, {
      startDate,
      endDate,
      limit,
      type: "web",
    });

    return res.status(200).json({ rows });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
