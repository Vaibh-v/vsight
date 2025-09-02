import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const r = await fetch("https://searchconsole.googleapis.com/webmasters/v3/sites/list", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const j = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: j.error?.message || "GSC list error" });

    const sites = (j.siteEntry || [])
      .filter((s: any) => s.permissionLevel !== "siteUnverifiedUser")
      .map((s: any) => ({ siteUrl: s.siteUrl, permission: s.permissionLevel }));

    res.status(200).json({ sites });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Server error" });
  }
}
