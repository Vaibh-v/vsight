import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gbpListLocations } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    // Optional explicit accountId (?accountId=123456789). If absent, auto-discovers accounts.
    const { accountId } = req.query as { accountId?: string };

    const locations = await gbpListLocations(String(token.access_token), accountId);
    // Normalize a minimal, UI-friendly shape
    const rows = locations.map(l => ({
      name: l.name,             // e.g., "locations/XXXX" or "accounts/{acc}/locations/{loc}"
      title: l.title || l.name, // fallback
    }));

    return res.status(200).json({ rows, count: rows.length });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
