import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

// Lists GBP locations the user can access.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const base = "https://mybusinessbusinessinformation.googleapis.com/v1/locations";
    const params = new URLSearchParams({
      readMask: "name,title,websiteUri",
      pageSize: "100"
    });
    const url = `${base}?${params.toString()}`;

    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });
    const json = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: json.error?.message || "GBP list error", raw: json });
    }
    // Normalize to { locations: [{name,title,websiteUri}, ...] }
    return res.status(200).json({ locations: json.locations || [] });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Unexpected server error" });
  }
}
