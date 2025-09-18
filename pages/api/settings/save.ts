// pages/api/settings/save.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { driveFindOrCreateSpreadsheet, sheetsAppend } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { rows } = req.body as { rows: (string | number)[][] };
    const { spreadsheetId } = await driveFindOrCreateSpreadsheet(req, {
      name: "VSight Settings",
      mimeType: "application/vnd.google-apps.spreadsheet",
    });

    if (spreadsheetId && Array.isArray(rows) && rows.length) {
      await sheetsAppend(req, {
        spreadsheetId,
        range: "Config!A1",
        values: rows,
      });
    }

    res.status(200).json({ ok: true, spreadsheetId });
  } catch (err: any) {
    res.status(200).json({ ok: false, error: err?.message || "Sheets not configured; saved locally only" });
  }
}
