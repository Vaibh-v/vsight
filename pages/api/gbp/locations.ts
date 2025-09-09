// pages/api/gbp/locations.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gbpListLocations } from "../../../lib/google"; // <-- fixed path

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const locations = await gbpListLocations(String(token.access_token));
    res.status(200).json({ locations });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to list GBP locations" });
  }
}
