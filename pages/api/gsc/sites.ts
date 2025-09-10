import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
// Try to import gscSites; if not present, fall back to gscListSites via dynamic require.
import { gscSites as _gscSites, gscListSites as _gscListSites } from "@/lib/google";

const gscSites = _gscSites ?? _gscListSites;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    if (typeof gscSites !== "function") {
      return res.status(500).json({ error: "GSC sites helper not available" });
    }

    const data = await gscSites(token.access_token as string);

    // Normalize: accept array or {sites:[...]} or {items:[...]}
    const raw = Array.isArray(data) ? data : (data as any)?.sites ?? (data as any)?.items ?? [];
    const sites = raw.map((s: any) => ({
      siteUrl: String(s?.siteUrl ?? s?.url ?? s?.siteUrlCanonical ?? ""),
      permissionLevel: String(s?.permissionLevel ?? s?.perm ?? ""),
    }));

    return res.status(200).json({ sites });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
