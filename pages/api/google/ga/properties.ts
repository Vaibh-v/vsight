import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gaListProperties } from "../../../lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const properties = await gaListProperties(String(token.access_token));
    res.status(200).json({ properties });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to list GA4 properties" });
  }
}
