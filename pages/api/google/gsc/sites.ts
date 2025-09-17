import type { NextApiRequest, NextApiResponse } from "next";
import { gscSites } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { sites } = await gscSites(req, res);
    const rows = (sites ?? [])
      .map((s: any) => ({
        id: s?.siteUrl || s?.url || "",
        title: s?.siteUrl || s?.url || "",
      }))
      .filter((x: any) => x.id);

    res.status(200).json({ rows });
  } catch (err: any) {
    res.status(500).json({
      error: err?.message || "Failed to list Search Console sites",
    });
  }
}
