// pages/api/google/gsc/top-queries.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gscQuery } from "../../../../lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

  const { siteUrl, startDate, endDate, country = "ALL", rowLimit = 100 } = req.body || {};
  if (!siteUrl) return res.status(400).json({ error: "siteUrl required" });

  const body: any = {
    startDate,
    endDate,
    dimensions: ["query"],
    rowLimit
  };

  if (country && country !== "ALL") {
    body.dimensionFilterGroups = [{
      groupType: "and",
      filters: [{ dimension: "country", operator: "equals", expression: country }]
    }];
  }

  try {
    const data = await gscQuery(String(token.access_token), siteUrl, body);
    res.status(200).json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "GSC query failed" });
  }
}
