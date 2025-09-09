// pages/api/google/gsc/sites.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gscSites } from "../../../../lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const sites = await gscSites(String(token.access_token));
    res.status(200).json({ sites });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Unexpected error" });
  }
}
