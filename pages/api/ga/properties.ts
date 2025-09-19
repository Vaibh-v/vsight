// pages/api/ga/properties.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { gaListProperties } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const properties = await gaListProperties(req); // expects the req, not a token
    res.status(200).json({ properties });
  } catch (e: any) {
    res
      .status(e?.status ?? 400)
      .json({ error: e?.message ?? "Failed to list GA4 properties" });
  }
}
