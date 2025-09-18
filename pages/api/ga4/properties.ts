// pages/api/ga4/properties.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getAccessToken, forwardJsonOrText } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getAccessToken(req);
    const r = await fetch(
      "https://analyticsadmin.googleapis.com/v1alpha/accountSummaries",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await forwardJsonOrText(r);

    const properties = (data?.accountSummaries ?? []).flatMap((acct: any) =>
      (acct?.propertySummaries ?? []).map((p: any) => ({
        id: p.property ?? "",
        displayName: `${acct.displayName ?? "Account"} (${p.displayName ?? p.property ?? "Property"})`,
      }))
    ).filter((p: any) => p.id);

    res.status(200).json({ properties, raw: data });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch GA4 properties" });
  }
}
