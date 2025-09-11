import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gscSites } from "@/lib/google";

/**
 * GET /api/gsc/sites
 * Returns the user's verified GSC sites (normalized).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const accessToken = String(token.access_token);

    // lib/google.ts → gscSites(accessToken) should return an array of site summaries
    const raw = await gscSites(accessToken);

    // normalize for UI dropdowns (value/label) and still keep the raw fields we care about
    const sites = (Array.isArray(raw) ? raw : []).map((s: any) => {
      const siteUrl =
        s?.siteUrl ??
        s?.siteUrlCanonical ??
        s?.siteUrlRaw ??
        ""; // tolerate varied shapes

      return {
        siteUrl,
        permissionLevel: s?.permissionLevel ?? s?.permission ?? "",
        value: siteUrl,
        label: siteUrl,
      };
    }).filter(s => s.siteUrl);

    return res.status(200).json({ sites });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
