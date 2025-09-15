// pages/api/gsc/sites.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gscSites } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req }) as any;
    if (!token?.access_token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const sites = await gscSites(String(token.access_token));

    // Normalize to { id, title }
    const rows = sites.map((s: any) => ({
      id: s?.siteUrl || s?.url || "",
      title: s?.siteUrl || s?.url || "",
    })).filter((x: any) => x.id);

    return res.status(200).json({ rows });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
