// pages/api/settings/get.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { driveFindOrCreateSpreadsheet, sheetsGet } from "@/lib/google";

const SHEET_NAME = "VSight Settings";
const RANGE = "Settings!A:Z";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { fileId } = await driveFindOrCreateSpreadsheet(req, SHEET_NAME);
    const { values } = await sheetsGet(req, fileId, RANGE);
    res.status(200).json({ ok: true, fileId, values });
  } catch (err: any) {
    res
      .status(err?.status ?? 500)
      .json({ ok: false, error: { message: err?.message ?? "Failed to load settings", details: err?.details ?? null } });
  }
}
