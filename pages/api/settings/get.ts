// pages/api/settings/get.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { driveFindOrCreateSpreadsheet, sheetsGet } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Example: fetch or create a backing sheet for app settings
    const { spreadsheetId } = await driveFindOrCreateSpreadsheet(req, {
      name: "VSight Settings",
      mimeType: "application/vnd.google-apps.spreadsheet",
    });

    const sheet = await sheetsGet(req, {
      spreadsheetId,
      range: "Config!A1:B100",
    });

    res.status(200).json({ spreadsheetId, config: sheet?.values ?? [] });
  } catch (err: any) {
    res.status(200).json({ spreadsheetId: null, config: [], note: "Sheets/Drive not fully configured yet" });
  }
}
