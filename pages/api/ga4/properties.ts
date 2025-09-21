// pages/api/ga4/properties.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { gaListProperties } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const data = await gaListProperties(req);
    res.status(200).json({ accountSummaries: data });
  } catch (e: any) {
    res
      .status(400)
      .json({ error: e?.message || "Failed to list GA4 account summaries" });
  }
}
