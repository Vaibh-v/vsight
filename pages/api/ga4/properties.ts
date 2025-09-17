// /pages/api/ga4/properties.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getAccessToken, forwardJsonOrText } from "../../../lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getAccessToken(req, res);
    const url = "https://analyticsadmin.googleapis.com/v1alpha/accountSummaries";
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await forwardJsonOrText(r);

    const properties: { name: string; propertyId: string; displayName?: string }[] = [];
    for (const acc of (data as any).accountSummaries ?? []) {
      for (const p of acc.propertySummaries ?? []) {
        properties.push({
          name: p.displayName,
          propertyId: p.property, // Example: "properties/376596938"
          displayName: p.displayName,
        });
      }
    }
    res.status(200).json({ properties });
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "Failed to list GA4 properties" });
  }
}
