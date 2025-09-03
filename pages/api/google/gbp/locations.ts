import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

  try {
    // 1) List accounts
    const accountsRes = await fetch(
      "https://mybusinessbusinessinformation.googleapis.com/v1/accounts",
      { headers: { Authorization: `Bearer ${token.access_token}` } }
    );
    const accountsJson = await accountsRes.json();
    if (!accountsRes.ok) {
      return res
        .status(accountsRes.status)
        .json({ error: accountsJson.error?.message || "Accounts API error", raw: accountsJson });
    }

    const accounts = accountsJson.accounts || [];
    const allLocations: any[] = [];

    // 2) For each account, list locations
    for (const acc of accounts) {
      const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title,storeCode,languageCode,websiteUri`;
      const locRes = await fetch(url, { headers: { Authorization: `Bearer ${token.access_token}` } });
      const locJson = await locRes.json();
      if (locRes.ok && locJson.locations) {
        allLocations.push(...locJson.locations);
      }
    }

    return res.status(200).json({ locations: allLocations });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Unexpected server error" });
  }
}
