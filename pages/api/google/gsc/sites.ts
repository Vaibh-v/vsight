// pages/api/google/gsc/sites.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { gscSites } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { sites, raw } = await gscSites(req);
    const rows = sites.map((s) => ({ id: s.siteUrl, title: s.siteUrl }));
    res.status(200).json({ ok: true, rows, raw });
  } catch (err: any) {
    res
      .status(err?.status ?? 500)
      .json({ ok: false, error: { message: err?.message ?? "Failed to list GSC sites", details: err?.details ?? null } });
  }
}
