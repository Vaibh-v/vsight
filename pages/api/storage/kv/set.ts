// pages/api/storage/kv/set.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import crypto from "crypto";
import {
  driveFindOrCreateSpreadsheet,
  sheetsAppend,
} from "@/lib/google";

const ALG = "aes-256-gcm";
const KEY = crypto
  .createHash("sha256")
  .update(String(process.env.APP_ENCRYPTION_KEY || "vsight-dev-key"))
  .digest();

function encrypt(text: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALG, KEY, iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const email = (token.email || "user").toString();
    const { key, value } = (req.body || {}) as { key?: string; value?: string };

    if (!key || typeof value !== "string") {
      return res.status(400).json({ error: "Missing key/value" });
    }

    // Find or create spreadsheet. RETURNS { id, name } — destructure the id.
    const { id: spreadsheetId } = await driveFindOrCreateSpreadsheet(
      String(token.access_token),
      `VSight_${email}`
    );

    const secret = encrypt(value);

    // Append to a sheet named "Vault". A bare sheet name is a valid A1 range (whole sheet).
    await sheetsAppend(
      String(token.access_token),
      spreadsheetId,
      "Vault",
      [[key, secret, new Date().toISOString()]],
      "USER_ENTERED"
    );

    return res.status(200).json({ ok: true, spreadsheetId });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
