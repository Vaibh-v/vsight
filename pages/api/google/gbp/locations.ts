import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gbpListLocations } from "@/lib/google";

/**
 * Returns a minimal list of GBP locations for the signed-in user:
 * [{ name: "locations/123...", title: "My Store" }, ...]
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Must be implemented/exported in lib/google.ts
    const data = await gbpListLocations(token.access_token as string);

    // Normalize a minimal shape for Connections dropdowns
    const locations = (Array.isArray(data) ? data : (data?.locations || data?.results || []))
      .map((l: any) => ({
        // typical GBP: l.name (e.g., "locations/xxx"); fallback to alternate keys
        name: l?.name || l?.locationName || "",
        // human-friendly label; try title, storeCode, or locationName
        title: l?.title || l?.storeCode || l?.locationName || "",
      }))
      .filter((x: any) => x.name);

    return res.status(200).json({ locations });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Unexpected error" });
  }
}
