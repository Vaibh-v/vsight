import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gbpListLocations } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Call the unified helper (returns { locations: Array<{name,title}> })
    const { locations } = await gbpListLocations(token.access_token as string);

    // Normalize + harden types for the Connections dropdown
    const out = (Array.isArray(locations) ? locations : []).map((l: any) => ({
      name: String(l?.name || ""),    // e.g., "locations/123..."
      title: String(l?.title || ""),  // business name / storeCode fallback already handled in helper
    }));

    return res.status(200).json({ locations: out });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
