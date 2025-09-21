import type { NextApiRequest, NextApiResponse } from "next";
import { gscSites } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const data = await gscSites(req);
    res.status(200).json({ sites: data.sites });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Failed to fetch GSC sites" });
  }
}
