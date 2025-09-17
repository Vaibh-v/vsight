import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gscTopQueries } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req });
    const accessToken = token?.accessToken as string | undefined;
    if (!accessToken) return res.status(401).json({ error: "No Google token" });

    const {
      siteUrl,
      startDate, endDate,
      dimension = "query",
      rowLimit = 25,
      country, device,
      keywordMode, keyword,
      sort = "clicks", dir = "desc"
    } = (req.method === "POST" ? req.body : req.query) as any;

    if (!siteUrl || !startDate || !endDate) {
      return res.status(400).json({ error: "siteUrl, startDate, endDate required" });
    }

    const rows = await gscTopQueries(accessToken, String(siteUrl), {
      startDate: String(startDate),
      endDate: String(endDate),
      dimension: String(dimension),
      rowLimit: Number(rowLimit),
      country: country ? String(country) : undefined,
      device: device ? String(device) : undefined,
      keywordMode: keywordMode ? String(keywordMode) : undefined,
      keyword: keyword ? String(keyword) : undefined,
      sort: String(sort),
      dir: String(dir),
    });

    res.status(200).json({ rows });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Failed to fetch GSC queries" });
  }
}
