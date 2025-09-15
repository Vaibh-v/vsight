// pages/api/aggregations/default.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gaRunReport, gscTimeseriesClicks } from "@/lib/google";

type GaPoint = { date: string; sessions: number };
type GscPoint = { date: string; clicks: number; impressions: number; ctr: number; position: number };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req }) as any;
    if (!token?.access_token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { propertyId, siteUrl, startDate, endDate } = req.query as {
      propertyId?: string;
      siteUrl?: string;
      startDate?: string;
      endDate?: string;
    };

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Missing startDate/endDate" });
    }

    const accessToken = String(token.access_token);
    const wantGA = !!propertyId;
    const wantGSC = !!siteUrl;

    // ---- GA4: return array<GaPoint>
    const gaPromise: Promise<GaPoint[]> = wantGA
      ? gaRunReport(accessToken, String(propertyId), {
          dimensions: ["date"],             // <— our lib accepts string[]
          metrics: ["sessions"],
          dateRanges: [{ startDate, endDate }],
        }).then((rows: any[]) =>
          rows.map((r: any) => ({
            date: r?.date ?? "",
            sessions: Number(r?.sessions ?? 0),
          }))
        )
      : Promise.resolve([]);

    // ---- GSC: return array<GscPoint>
    const gscPromise: Promise<GscPoint[]> = wantGSC
      ? gscTimeseriesClicks(accessToken, String(siteUrl), {
          startDate,
          endDate,
        }).then((result: { rows: GscPoint[] } | GscPoint[]) => {
          // Handle either `{rows: []}` or `[]`
          const rows = Array.isArray(result) ? result : Array.isArray((result as any)?.rows) ? (result as any).rows : [];
          return rows.map((r: any) => ({
            date: r?.date ?? "",
            clicks: Number(r?.clicks ?? 0),
            impressions: Number(r?.impressions ?? 0),
            ctr: Number(r?.ctr ?? 0),
            position: Number(r?.position ?? 0),
          }));
        })
      : Promise.resolve([]);

    const [ga, gsc] = await Promise.all([gaPromise, gscPromise]);

    return res.status(200).json({
      ok: true,
      ga,   // array<GaPoint>
      gsc,  // array<GscPoint>
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
