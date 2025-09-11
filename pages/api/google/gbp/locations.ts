// pages/api/google/gbp/locations.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gbpListLocations } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const data = await gbpListLocations(String(token.access_token));

    // Normalize for UI dropdowns
    const locations = (Array.isArray((data as any)?.locations) ? (data as any).locations : []).map((l: any) => ({
      name: String(l?.name || ""),
      title: String(l?.title || l?.locationName || ""),
    }));

    return res.status(200).json({ locations });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Failed to list GBP locations" });
  }
}
