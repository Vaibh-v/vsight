import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { driveFindOrCreateSpreadsheet, sheetsAppend } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { rows } = (req.body || {}) as { rows?: any[][] };
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(400).json({ error: "Missing rows" });
    }

    const email = String(token.email || "user");
    // FIX: expect a string spreadsheetId
    const spreadsheetId = await driveFindOrCreateSpreadsheet(String(token.access_token), `VSight_${email}`);

    await sheetsAppend(String(token.access_token), spreadsheetId, "Vault", rows);
    return res.status(200).json({ ok: true, spreadsheetId, appended: rows.length });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
