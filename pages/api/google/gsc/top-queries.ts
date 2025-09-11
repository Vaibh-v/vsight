import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gscTopQueries } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const q = (req.query || {}) as Record<string, string>;
    const siteUrl   = q.siteUrl;
    const startDate = q.startDate;
    const endDate   = q.endDate;
    const rowLimit  = q.limit ? Number(q.limit) : 1000;

    if (!siteUrl || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing siteUrl/startDate/endDate" });
    }

    // NOTE: Do NOT pass `dimensions` here. gscTopQueries() always uses ["query"] internally.
    const data = await gscTopQueries(token.access_token as string, siteUrl, {
      startDate,
      endDate,
      rowLimit,
      type: "web",
      // dimensionFilterGroups?: pass only if you actually need filters
    });

    const rawRows = Array.isArray((data as any)?.rows) ? (data as any).rows : [];
    const rows = rawRows.map((r: any) => ({
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
