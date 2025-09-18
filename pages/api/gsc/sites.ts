// pages/api/gsc/sites.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { gscSites } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await gscSites(req);
    const sites = Array.isArray(payload?.sites) ? payload.sites : [];

    // Normalize for pickers: { id, title }
    const rows = sites
      .map((s: any) => ({
        id: s?.siteUrl || s?.url || "",
        title: s?.siteUrl || s?.url || "",
      }))
      .filter((x: any) => x.id);

    res.status(200).json({ sites: rows, raw: payload });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch GSC sites" });
  }
}
