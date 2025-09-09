import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gscTopQueries } from "../../../lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });

    const { siteUrl, startDate, endDate, country = "ALL", rowLimit = 100, maxPosition = 10 } = req.body || {};
    if (!siteUrl || !startDate || !endDate) return res.status(400).json({ ok: false, error: "MISSING_PARAMS" });

    const data = await gscTopQueries(String(token.access_token), {
      siteUrl, startDate, endDate, country, rowLimit, maxPosition
    });

    res.json({ ok: true, data });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message || "UNKNOWN" });
  }
}
