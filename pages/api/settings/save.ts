// pages/api/settings/save.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { driveFindOrCreateSpreadsheet, sheetsAppend } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const {
      name = "VSight Settings",
      parentFolderId,
      range = "Settings!A1",
      values = [],
      valueInputOption = "USER_ENTERED",
    } = (req.body || {}) as {
      name?: string;
      parentFolderId?: string;
      range?: string;
      values?: Array<Array<string | number | boolean>>;
      valueInputOption?: "RAW" | "USER_ENTERED";
    };

    // Ensure values is 2D array for Sheets
    const safeValues = Array.isArray(values) && Array.isArray(values[0]) ? values : [];

    const { id } = await driveFindOrCreateSpreadsheet(
      String(token.access_token),
      name,
      parentFolderId || undefined
    );

    const result = await sheetsAppend(
      String(token.access_token),
      id,
      range,
      safeValues,
      valueInputOption
    );

    return res.status(200).json({ spreadsheetId: id, range, updates: result?.updates || result });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Failed to save settings" });
  }
}
