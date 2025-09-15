import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gaRunReport, gscTimeseriesClicks } from "@/lib/google";

type GaRow = { date: string; sessions: number };
type GscRow = { date: string; clicks: number; impressions: number; ctr: number; position: number };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req });
    if (!token?.access_token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { propertyId, siteUrl, startDate, endDate } = req.query as {
      propertyId?: string;
      siteUrl?: string;
      startDate: string;
      endDate: string;
    };

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }

    const accessToken = String(token.access_token);
    const wantGA = !!propertyId;
    const wantGSC = !!siteUrl;

    const [ga, gsc] = await Promise.all([
      wantGA
        ? gaRunReport(accessToken, String(propertyId), {
            dimensions: [{ name: "date" }],
            metrics: [{ name: "sessions" }],
            dateRanges: [{ startDate: String(startDate), endDate: String(endDate) }],
          })
        : Promise.resolve({ rows: [] as any[] }),
      wantGSC
        ? gscTimeseriesClicks(accessToken, String(siteUrl), {
            startDate: String(startDate),
            endDate: String(endDate),
          })
        : Promise.resolve({ rows: [] as any[] }),
    ]);

    // GA: expect { rows: [...] }, but tolerate arrays too.
    const gaRaw: any[] = Array.isArray((ga as any)?.rows)
      ? (ga as any).rows
      : Array.isArray(ga)
      ? (ga as any)
      : [];
    const gaRows: GaRow[] = gaRaw.map((r: any) => ({
      date: r?.date ?? "",
      sessions: Number(r?.sessions ?? 0),
    }));

    // GSC: tolerate either { rows: [...] } or bare array
    const gscRaw: any[] = Array.isArray((gsc as any)?.rows)
      ? (gsc as any).rows
      : Array.isArray(gsc)
      ? (gsc as any)
      : [];
    const gscRows: GscRow[] = gscRaw.map((r: any) => ({
      date: r?.date ?? "",
      clicks: Number(r?.clicks ?? 0),
      impressions: Number(r?.impressions ?? 0),
      ctr: Number(r?.ctr ?? 0),
      position: Number(r?.position ?? 0),
    }));

    return res.status(200).json({ ga: gaRows, gsc: gscRows });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
