// pages/api/google/gsc/sites.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { gscListSites } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const sites = await gscListSites(req);
    res.status(200).json({ sites });
  } catch (e: any) {
    res
      .status(400)
      .json({ error: e?.message || "Failed to list Search Console sites" });
  }
}
