// FILE: pages/api/settings/get.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { driveEnsureSpreadsheet, sheetsGet } from "../../../lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.access_token) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const email = String(token.email || "user");

  try {
    const spreadsheetId = await driveEnsureSpreadsheet(String(token.access_token), `VSight_${email}`);
    const j = await sheetsGet(String(token.access_token), spreadsheetId, "Settings!A:C");

    const map: Record<string, string> = {};
    for (const r of (j.values || [])) {
      if (r[0] && r[1]) map[r[0]] = r[1];
    }

    return res.status(200).json({ settings: map });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Unexpected error" });
  }
}
