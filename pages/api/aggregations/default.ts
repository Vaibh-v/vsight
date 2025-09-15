// pages/api/aggregations/default.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gaRunReport, gscTimeseriesClicks } from "@/lib/google";

// Shapes we expect back from lib/google
type GaRow = { date: string; sessions: number };
type GscRow = { date: string; clicks: number; impressions: number; ctr: number; position: number };

// Normalize GA/GSC results so TypeScript and the client both get a stable shape
function asGaRows(x: any): GaRow[] {
  if (!x) return [];
  if (Array.isArray(x)) return x as GaRow[];                 // some callers return rows directly
  if (Array.isArray(x.rows)) return x.rows as GaRow[];       // our lib returns { rows }
  return [];
}
function asGscRows(x: any): GscRow[] {
  if (!x) return [];
  if (Array.isArray(x)) return x as GscRow[];
  if (Array.isArray(x.rows)) return x.rows as GscRow[];
  return [];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const accessToken = String(token?.access_token || "");
    if (!accessToken) return res.status(401).json({ error: "Not authenticated" });

    const { propertyId, siteUrl, startDate, endDate } = req.query as any;

    const end = String(endDate || new Date().toISOString().slice(0, 10));
    const start =
      String(startDate) ||
      new Date(Date.now() - 27 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const wantGA = !!propertyId;
    const wantGSC = !!siteUrl;

    const [gaRaw, gscRaw] = await Promise.all([
      wantGA
        ? gaRunReport(accessToken, String(propertyId), {
            // our lib accepts string[] (and also {name}[]), so keep it simple
            dimensions: ["date"],
            metrics: ["sessions"],
            dateRanges: [{ startDate: start, endDate: end }],
          })
        : Promise.resolve({ rows: [] }),
      wantGSC
        ? gscTimeseriesClicks(accessToken, String(siteUrl), {
            startDate: start,
            endDate: end,
          })
        : Promise.resolve({ rows: [] }),
    ]);

    const ga = asGaRows(gaRaw);
    const gsc = asGscRows(gscRaw);

    return res.status(200).json({ ga, gsc });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
