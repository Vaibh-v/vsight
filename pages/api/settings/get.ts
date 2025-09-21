// pages/api/settings/get.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { driveFindOrCreateSpreadsheet, sheetsGet } from "@/lib/google";

const SHEET_NAME = "VSight Settings";
const RANGE = "Settings!A:Z";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Ensure the settings spreadsheet exists (create if missing)
    const spreadsheetId = await driveFindOrCreateSpreadsheet(req, SHEET_NAME);

    // Read current settings
    const values = await sheetsGet(req, spreadsheetId, RANGE);

    // Optional: transform rows into key/value map if your sheet's first row are headers
    let rows = values || [];
    let settings: Record<string, string> = {};
    if (rows.length > 1) {
      const headers = rows[0];
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;
        // Convert the row to an object using headers (pad safely)
        const obj: Record<string, string> = {};
        headers.forEach((h: string, i: number) => {
          obj[h] = String(row[i] ?? "");
        });
        // If there's a "key" column, use it as key => value
        if (obj.key) settings[obj.key] = obj.value ?? "";
      }
    }

    res.status(200).json({
      ok: true,
      spreadsheetId,
      range: RANGE,
      values: rows,
      settings, // derived simple map if your sheet uses key/value columns
    });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || "Failed to load settings" });
  }
}
