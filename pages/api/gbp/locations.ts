// pages/api/gbp/locations.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, {} as any);
    const accessToken = (session as any)?.accessToken as string | undefined;
    if (!accessToken) return res.status(401).json({ error: "Not authenticated" });

    const url =
      "https://mybusinessbusinessinformation.googleapis.com/v1/accounts/-/locations" +
      "?readMask=name,title,primaryCategory,websiteUri,phoneNumbers,regularHours";

    const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const json = await r.json();
    if (!r.ok) return res.status(r.status).json(json);

    const rows = (json.locations ?? []).map((l: any) => ({
      id: l.name?.split("/").pop(),
      title: l.title,
      category: l.primaryCategory?.displayName ?? "—",
      website: l.websiteUri ?? "—",
      phone: l.phoneNumbers?.primaryPhone ?? "—",
      hasHours: !!l.regularHours?.periods?.length,
    }));

    res.json({ rows });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "unknown" });
  }
}
