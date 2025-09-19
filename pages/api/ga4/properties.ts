// pages/api/ga4/properties.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { gaListProperties } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { rows, raw } = await gaListProperties(req);
    res.status(200).json({ ok: true, rows, raw });
  } catch (err: any) {
    res
      .status(err?.status ?? 500)
      .json({ ok: false, error: { message: err?.message ?? "Failed to list properties", details: err?.details ?? null } });
  }
}
