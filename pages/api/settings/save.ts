import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { driveFindOrCreateSpreadsheet, sheetsAppend } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });
  const email = String(token.email || "user");

  const { entries } = (req.body || {}) as { entries: Array<{ key: string; value: string }> };
  if (!Array.isArray(entries) || !entries.length) return res.status(400).json({ error: "entries required" });

  try {
    const spreadsheetId = await driveFindOrCreateSpreadsheet(token.access_token as string, `VSight_${email}`);
    const now = new Date().toISOString();
    const values = entries.map((e) => [e.key, e.value, now]);
    await sheetsAppend(token.access_token as string, spreadsheetId, "Settings", values);
    res.status(200).json({ ok: true, saved: values.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Unexpected error" });
  }
}
