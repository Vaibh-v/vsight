// pages/api/ga/properties.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { gaListProperties } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const props = await gaListProperties(req);
    res.status(200).json({ properties: props });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Failed to list GA4 properties" });
  }
}
