import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import crypto from "crypto";
import { driveFindOrCreateSpreadsheet, sheetsAppend } from "@/lib/google";

const ALG = "aes-256-gcm";
const KEY = Buffer.from((process.env.KV_ENCRYPTION_KEY || "").padEnd(32, "0").slice(0, 32), "utf8");

function encrypt(text: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALG, KEY, iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const token: any = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const email = String(token.email || "user");
    const { key, value } = (req.body || {}) as any;
    if (!key || typeof value !== "string") return res.status(400).json({ error: "Missing key/value" });

    const { id: spreadsheetId } = await driveFindOrCreateSpreadsheet(
      String(token.access_token),
      `VSight_${email}`
    );

    const secret = encrypt(value);
    await sheetsAppend(String(token.access_token), spreadsheetId, "Vault", [
      [key, secret, new Date().toISOString()],
    ]);
    return res.status(200).json({ ok: true, spreadsheetId });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
