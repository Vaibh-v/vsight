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
    // List all account summaries then flatten property summaries
    const url = "https://analyticsadmin.googleapis.com/v1alpha/accountSummaries?pageSize=200";
    const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error?.message || "Failed to list GA accounts");

    const properties =
      (j.accountSummaries ?? []).flatMap((acc: any) =>
        (acc.propertySummaries ?? []).map((p: any) => ({
          name: p.displayName ?? p.property,
          propertyId: (p.property ?? "").replace("properties/", ""),
          displayName: p.displayName ?? undefined,
        }))
      ) ?? [];

    return res.status(200).json({ properties });
  } catch (e: any) {
    console.error("ga/properties error", e);
    return res.status(500).json({ error: e?.message || "Internal error" });
  }
}
