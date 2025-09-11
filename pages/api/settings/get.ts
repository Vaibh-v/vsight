// pages/api/settings/get.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { driveFindOrCreateSpreadsheet, sheetsGet } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    // You can change these defaults or let the client pass them via query.
    const {
      name = "VSight Settings",
      parentFolderId,
      range = "Settings!A1:Z100",
    } = (req.query || {}) as Record<string, string>;

    const { id } = await driveFindOrCreateSpreadsheet(String(token.access_token), String(name), parentFolderId ? String(parentFolderId) : undefined);

    const values = await sheetsGet(String(token.access_token), id, String(range));

    return res.status(200).json({ spreadsheetId: id, range, values });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Failed to load settings" });
  }
}
