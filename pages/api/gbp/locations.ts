import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gbpListLocations } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const data = await gbpListLocations(String(token.access_token));
    const locations = Array.isArray(data)
      ? data
      : (((data as any)?.locations || (data as any)?.results || []) as any[]).map(l => ({
          name: l.name || l.locationName || "",
          title: l.title || l.storeCode || l.locationName || ""
        }));

    res.status(200).json({ locations });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to list GBP locations" });
  }
}
