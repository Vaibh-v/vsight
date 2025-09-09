// pages/api/google/gbp/locations.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gbpListLocations } from "../../../../lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Call GBP Business Information API
    const data = await gbpListLocations(token.access_token as string);

    // Normalize a minimal shape for the Connections dropdown
    const locations = (data?.locations || data?.results || []).map((l: any) => ({
      name: l.name || l.locationName || "", // e.g. "locations/12345678901234567890"
      title: l.title || l.storeCode || l.locationName || "",
    }));

    return res.status(200).json({ locations });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Failed to list GBP locations" });
  }
}
