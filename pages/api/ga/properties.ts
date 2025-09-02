import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    let url = "https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200";
    const out: any[] = [];

    // simple pagination loop
    for (let i = 0; i < 10; i++) {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token.access_token}` } });
      const j = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: j.error?.message || "Admin API error" });

      (j.accountSummaries || []).forEach((a: any) => {
        (a.propertySummaries || []).forEach((p: any) => {
          const id = String(p.property || "").replace("properties/", "");
          out.push({ id, displayName: p.displayName || id, account: a.name });
        });
      });

      if (!j.nextPageToken) break;
      url = `https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200&pageToken=${encodeURIComponent(j.nextPageToken)}`;
    }

    res.status(200).json({ properties: out });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Server error" });
  }
}
