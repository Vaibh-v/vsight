import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { driveFindOrCreateSpreadsheet, sheetsGet } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const email = String(token.email || "user");
    // FIX: returns a string spreadsheetId (not an object)
    const spreadsheetId = await driveFindOrCreateSpreadsheet(String(token.access_token), `VSight_${email}`);

    const j = await sheetsGet(String(token.access_token), spreadsheetId, "Vault!A:C");
    return res.status(200).json({ values: j?.values || [], spreadsheetId });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
