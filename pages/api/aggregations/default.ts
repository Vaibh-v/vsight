// pages/api/aggregations/default.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gaRunReport, gscTimeseriesClicks } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { propertyId, siteUrl, startDate, endDate } = req.query as {
      propertyId?: string;
      siteUrl?: string;
      startDate?: string;
      endDate?: string;
    };

    const accessToken = String(token.access_token);
    const wantGA = !!propertyId && !!startDate && !!endDate;
    const wantGSC = !!siteUrl && !!startDate && !!endDate;

    const [gaResp, gscRows] = await Promise.all([
      wantGA
        ? gaRunReport(accessToken, String(propertyId), {
            dimensions: ["date"],
            metrics: ["sessions"],
            dateRanges: [{ startDate: String(startDate), endDate: String(endDate) }],
          })
        : Promise.resolve(null),
      wantGSC
        // accepts either positional or object; we send object to match your last call-site
        ? gscTimeseriesClicks(accessToken, String(siteUrl), {
            startDate: String(startDate),
            endDate: String(endDate),
          })
        : Promise.resolve([] as any[]),
    ]);

    // Normalize GA rows -> { date, sessions }
    const gaRows =
      Array.isArray((gaResp as any)?.rows) && Array.isArray((gaResp as any)?.dimensionHeaders)
        ? (gaResp as any).rows.map((r: any) => {
            const dIdx = 0; // first dimension = date
            const mIdx = 0; // first metric = sessions
            const date = r.dimensionValues?.[dIdx]?.value || "";
            const sessions = Number(r.metricValues?.[mIdx]?.value || 0);
            return { date, sessions };
          })
        : [];

    // GSC rows already come as { date, clicks, impressions, ctr, position }
    return res.status(200).json({
      ga: { rows: gaRows },
      gsc: { rows: gscRows },
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
