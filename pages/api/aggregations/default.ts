// pages/api/aggregations/default.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gaRunReport, gscQuery } from "@/lib/google";

/**
 * Returns daily aggregates merged from:
 *  - GA4 (sessions)
 *  - GSC (clicks, impressions, ctr, position)
 *
 * Query params:
 *  - propertyId: GA4 property id (optional; GA skipped if missing)
 *  - siteUrl: GSC site url (optional; GSC skipped if missing)
 *  - startDate, endDate (YYYY-MM-DD) — required
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const { propertyId, siteUrl, startDate, endDate } = (req.query || {}) as any;
    const accessToken = String(token.access_token);

    const start = String(startDate || "").trim();
    const end = String(endDate || "").trim();
    if (!start || !end) return res.status(400).json({ error: "Missing startDate/endDate" });

    const wantGA = !!propertyId;
    const wantGSC = !!siteUrl;

    const gaPromise = wantGA
      ? gaRunReport(accessToken, String(propertyId), {
          dimensions: [{ name: "date" }],
          metrics: [{ name: "sessions" }],
          dateRanges: [{ startDate: start, endDate: end }],
        })
      : Promise.resolve(null);

    const gscPromise = wantGSC
      ? gscQuery(accessToken, String(siteUrl), {
          startDate: start,
          endDate: end,
          dimensions: ["date"], // our gscQuery accepts string names and normalizes to {date,...}
          rowLimit: 1000,
          type: "web",
        })
      : Promise.resolve([]);

    const [gaRep, gscRows] = await Promise.all([gaPromise, gscPromise]);

    // ---- Normalize GA rows ----
    type GaRow = { date: string; sessions: number };
    const gaRows: GaRow[] = Array.isArray((gaRep as any)?.rows)
      ? (gaRep as any).rows.map((r: any) => ({
          date: String(r?.dimensionValues?.[0]?.value || ""),
          sessions: Number(r?.metricValues?.[0]?.value ?? 0),
        }))
      : [];

    // ---- Normalize GSC rows (already normalized by gscQuery) ----
    type GscRow = { date?: string; clicks: number; impressions: number; ctr: number; position: number };
    const gRows: GscRow[] = Array.isArray(gscRows) ? (gscRows as GscRow[]) : [];

    // ---- Merge by date ----
    const byDate = new Map<
      string,
      { date: string; sessions?: number; clicks?: number; impressions?: number; ctr?: number; position?: number }
    >();

    for (const r of gaRows) {
      if (!r.date) continue;
      const row = byDate.get(r.date) || { date: r.date };
      row.sessions = Number(r.sessions ?? 0);
      byDate.set(r.date, row);
    }

    for (const r of gRows) {
      const d = String(r.date || "");
      if (!d) continue;
      const row = byDate.get(d) || { date: d };
      row.clicks = Number(r.clicks ?? 0);
      row.impressions = Number(r.impressions ?? 0);
      row.ctr = Number(r.ctr ?? 0); // keep as decimal (e.g., 0.1234). Convert to % in UI if desired.
      row.position = Number(r.position ?? 0);
      byDate.set(d, row);
    }

    const data = Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
    return res.status(200).json({ data });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
