import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { driveFindOrCreateSpreadsheet, sheetsAppend } from "@/lib/google";

function nowIso() { return new Date().toISOString(); }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const email = String(token.email || "user");
    const { key, value } = (req.body || {}) as any;
    if (!key || typeof value !== "string") return res.status(400).json({ error: "Missing key/value" });

    const { id: spreadsheetId } = await driveFindOrCreateSpreadsheet(String(token.access_token), `VSight_${email}`);
    await sheetsAppend(String(token.access_token), spreadsheetId, "Vault", [[key, value, nowIso()]]);
    return res.status(200).json({ ok: true, spreadsheetId });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
