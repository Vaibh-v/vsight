// pages/api/gsc/top-queries.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gscTopQueries } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Accept both styles: start/end OR startDate/endDate, and rowLimit OR limit
    const siteUrl =
      (req.query.siteUrl as string | undefined) ?? (req.query.site as string | undefined);
    const start =
      (req.query.start as string | undefined) ?? (req.query.startDate as string | undefined);
    const end =
      (req.query.end as string | undefined) ?? (req.query.endDate as string | undefined);

    // Prefer ?limit=, but tolerate legacy ?rowLimit=
    const limitParam =
      (req.query.limit as string | undefined) ?? (req.query.rowLimit as string | undefined);
    const limit = limitParam ? Number(limitParam) : 1000;

    if (!siteUrl || !start || !end) {
      return res.status(400).json({ error: "Missing siteUrl/start/end" });
    }

    const rows = await gscTopQueries(String(token.access_token), String(siteUrl), {
      startDate: String(start),
      endDate: String(end),
      limit,
    });

    return res.status(200).json({ rows });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
