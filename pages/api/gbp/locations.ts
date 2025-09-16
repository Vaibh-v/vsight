// pages/api/gbp/locations.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const token = await getToken({ req });
    if (!token?.access_token) return res.status(401).json({ error: "Unauthenticated" });

    // 1) Get Accounts
    const acc = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!acc.ok) return res.status(acc.status).json({ error: "Account list failed", detail: await acc.text() });
    const accounts = await acc.json();
    const accountName: string | undefined = accounts.accounts?.[0]?.name; // e.g., "accounts/123456789"
    if (!accountName) return res.json({ locations: [] });

    // 2) List Locations (basic profile)
    const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?pageSize=50`;
    const loc = await fetch(url, { headers: { Authorization: `Bearer ${token.access_token}` } });
    if (!loc.ok) return res.status(loc.status).json({ error: "Locations failed", detail: await loc.text() });
    const data = await loc.json();

    res.json({ locations: data.locations ?? [] });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
}
