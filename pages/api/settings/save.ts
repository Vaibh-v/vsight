// pages/api/settings/save.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { driveFindOrCreateSpreadsheet, sheetsAppend } from "@/lib/google";

const SHEET_NAME = "VSight Settings";
const RANGE = "Settings!A:Z";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: { message: "Method not allowed" } });
  }
  try {
    const values = (req.body?.values as any[][]) ?? null;
    if (!Array.isArray(values) || !Array.isArray(values[0])) {
      return res.status(400).json({ ok: false, error: { message: "`values` must be a 2D array" } });
    }
    const { fileId } = await driveFindOrCreateSpreadsheet(req, SHEET_NAME);
    const { updates } = await sheetsAppend(req, fileId, RANGE, values);
    res.status(200).json({ ok: true, fileId, updates });
  } catch (err: any) {
    res
      .status(err?.status ?? 500)
      .json({ ok: false, error: { message: err?.message ?? "Failed to save settings", details: err?.details ?? null } });
  }
}
