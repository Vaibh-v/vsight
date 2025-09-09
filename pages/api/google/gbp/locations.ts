import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gbpKeywordsLast3M } from "../../../lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });

    const { locationName } = req.query;
    if (!locationName) return res.status(400).json({ ok: false, error: "MISSING_LOCATION" });

    const data = await gbpKeywordsLast3M(String(token.access_token), String(locationName));
    res.json({ ok: true, data });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message || "UNKNOWN" });
  }
}
