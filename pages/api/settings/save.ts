import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { driveEnsureSpreadsheet, sheetsAppend } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

  const { entries } = (req.body || {}) as { entries: Array<{ key: string; value: string }> };
  if (!Array.isArray(entries) || !entries.length) return res.status(400).json({ error: "entries required" });

  try {
    const spreadsheetId = await driveEnsureSpreadsheet(String(token.access_token), `VSight_${String(token.email || "user")}`);
    const now = new Date().toISOString();
    const values = entries.map(e => [e.key, e.value, now]);
    await sheetsAppend(String(token.access_token), spreadsheetId, "Settings", values);
    res.status(200).json({ ok: true, saved: values.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Unexpected error" });
  }
}
