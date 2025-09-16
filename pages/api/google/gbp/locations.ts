import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions as any);
  const accessToken = (session as any)?.access_token as string | undefined;
  if (!accessToken) return res.status(401).json({ error: "Not authenticated" });

  try {
    // List accounts
    const accRes = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const accJson = await accRes.json();
    if (!accRes.ok) {
      return res.status(accRes.status).send(JSON.stringify(accJson));
    }
    const accounts: string[] = (accJson.accounts ?? []).map((a: any) => a.name);

    // List locations for each account (first 100)
    const allLocations: any[] = [];
    for (const acc of accounts) {
      const locRes = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${acc}/locations?pageSize=100`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const locJson = await locRes.json();
      if (locRes.status === 429) {
        // Quota 0 or exceeded -> surface clearly
        return res.status(429).json(locJson);
      }
      if (!locRes.ok) throw new Error(locJson?.error?.message || "GBP locations failed");
      allLocations.push(...(locJson.locations ?? []));
    }

    return res.status(200).json({ accounts, locations: allLocations });
  } catch (e: any) {
    console.error("gbp/locations error", e);
    return res.status(500).json({ error: e?.message || "Internal error" });
  }
}
