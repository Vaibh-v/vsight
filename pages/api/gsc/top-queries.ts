import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gscQuery } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const { siteUrl, startDate, endDate, rowLimit = 100, country = "ALL" } = (req.body || {}) as any;
    if (!siteUrl || !startDate || !endDate) return res.status(400).json({ error: "Missing params" });

    const filters =
      country && country !== "ALL"
        ? [{ filters: [{ dimension: "country", operator: "equals", expression: country }] }]
        : undefined;

    const j = await gscQuery(token.access_token as string, siteUrl, {
      startDate,
      endDate,
      dimensions: ["query"],
      rowLimit,
      type: "web",
      dimensionFilterGroups: filters,
    });

    res.status(200).json(j);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Unexpected error" });
  }
}
