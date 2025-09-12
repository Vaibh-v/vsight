import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gaRunReport, gscTimeseriesClicks } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const { propertyId, siteUrl, startDate: start, endDate: end } = req.query as any;
    if (!start || !end) return res.status(400).json({ error: "Missing startDate/endDate" });

    const wantGA = !!propertyId;
    const wantGSC = !!siteUrl;

    const [gaResp, gscRows] = await Promise.all([
      wantGA
        ? gaRunReport(String(token.access_token), String(propertyId), {
            dimensions: [{ name: "date" }],
            metrics: [{ name: "sessions" }],
            dateRanges: [{ startDate: String(start), endDate: String(end) }],
          })
        : Promise.resolve(null),
      wantGSC
        ? gscTimeseriesClicks(String(token.access_token), String(siteUrl), String(start), String(end))
        : Promise.resolve([]),
    ]);

    // Build date map
    const map = new Map<string, { date: string; sessions?: number; clicks?: number }>();

    // GA rows
    const gaRows = (gaResp?.rows || []) as any[];
    for (const r of gaRows) {
      const d = String(r?.dimensionValues?.[0]?.value || "");
      const sessions = Number(r?.metricValues?.[0]?.value || 0);
      const row = map.get(d) || { date: d };
      row.sessions = (row.sessions || 0) + sessions;
      map.set(d, row);
    }

    // GSC rows (already normalized)
    for (const r of (gscRows as any[])) {
      const d = String(r?.date || "");
      const clicks = Number(r?.clicks || 0);
      const row = map.get(d) || { date: d };
      row.clicks = (row.clicks || 0) + clicks;
      map.set(d, row);
    }

    const data = Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
    return res.status(200).json({ data });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
