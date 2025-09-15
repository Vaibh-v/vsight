import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { driveFindOrCreateSpreadsheet, sheetsAppend } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const token: any = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const email = String(token.email || "user");
    const { id: spreadsheetId } = await driveFindOrCreateSpreadsheet(
      String(token.access_token),
      `VSight_${email}`
    );

    // Accept either { rows: any[][] } OR { key, value }
    const body = (req.body || {}) as any;
    let rows: any[][] = [];

    if (Array.isArray(body.rows)) {
      rows = body.rows;
    } else if (typeof body.key === "string" && typeof body.value === "string") {
      rows = [[body.key, body.value, new Date().toISOString()]];
    } else {
      return res.status(400).json({ error: "Provide rows[][] or key/value" });
    }

    if (rows.length) {
      await sheetsAppend(String(token.access_token), spreadsheetId, "Vault", rows);
    }
    return res.status(200).json({ ok: true, appended: rows.length, spreadsheetId });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
