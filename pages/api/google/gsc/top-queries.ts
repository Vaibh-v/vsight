import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gscTopQueries } from "@/lib/google";

/**
 * GET /api/google/gsc/top-queries?siteUrl=...&start=YYYY-MM-DD&end=YYYY-MM-DD&limit=1000
 * Returns: { rows: Array<{ query, clicks, impressions, ctr, position }> }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { siteUrl, start, end, limit } = req.query as {
      siteUrl?: string;
      start?: string;
      end?: string;
      limit?: string;
    };

    if (!siteUrl || !start || !end) {
      return res.status(400).json({ error: "siteUrl, start, and end are required" });
    }

    const rowLimit = limit ? Number(limit) : 1000;

    // NOTE: gscTopQueries expects 4–5 positional args (NOT a single object)
    const data = await gscTopQueries(
      token.access_token as string,
      siteUrl,
      start,
      end,
      rowLimit
    );

    // Normalize output to a stable shape { rows: [...] }
    const rows = (Array.isArray(data) ? data : (data as any)?.rows || (data as any)?.data || [])
      .map((row: any) => ({
        query: String(row?.query ?? row?.keys?.[0] ?? ""),
        clicks: Number(row?.clicks ?? 0),
        impressions: Number(row?.impressions ?? 0),
        ctr: Number(
          // Some helpers return 0–1; some return % already. We keep it 0–1 here and let UI multiply by 100.
          row?.ctr ?? row?.ctrFloat ?? 0
        ),
        position: Number(row?.position ?? 0),
      }));

    return res.status(200).json({ rows });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
