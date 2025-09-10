// pages/api/aggregations/default.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gaRunReport } from "@/lib/google";

type GaRow = { date: string; sessions: number };
type GscRow = { date: string; clicks: number; impressions: number; ctr: number; position: number };
type SeriesRow = {
  date: string;
  sessions: number;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

function fmtGaDate(yyyymmdd: string): string {
  // GA4 returns "YYYYMMDD" — normalize to "YYYY-MM-DD" to match GSC
  if (yyyymmdd && yyyymmdd.length === 8) {
    return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
  }
  return yyyymmdd;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const { propertyId, siteUrl, startDate, endDate } = (req.query || {}) as Record<string, string>;
    if (!propertyId || !siteUrl || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing params" });
    }

    // ---------- GA: sessions by date ----------
    const gaResp = await gaRunReport(String(token.access_token), String(propertyId), {
      dimensions: [{ name: "date" }],
      metrics: [{ name: "sessions" }],
      dateRanges: [{ startDate, endDate }],
    });

    const gaRows: GaRow[] = Array.isArray(gaResp?.rows)
      ? gaResp.rows.map((r: any) => ({
          date: fmtGaDate(r?.dimensionValues?.[0]?.value || ""),
          sessions: Number(r?.metricValues?.[0]?.value || 0),
        }))
      : [];

    // ---------- GSC: clicks/impressions/ctr/position by date ----------
    // Call Search Console directly to avoid any missing exports.
    const gscEndpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      siteUrl
    )}/searchAnalytics/query`;

    const gscFetch = await fetch(gscEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["date"],
        rowLimit: 25000,
        type: "web",
      }),
    });

    if (!gscFetch.ok) {
      const errText = await gscFetch.text().catch(() => "");
      return res
        .status(502)
        .json({ error: `GSC query failed (${gscFetch.status}): ${errText || "Unknown error"}` });
    }

    const gscJson: any = await gscFetch.json();
    const gscRows: GscRow[] = Array.isArray(gscJson?.rows)
      ? gscJson.rows.map((row: any) => ({
          date: row?.keys?.[0] || "",
          clicks: Number(row?.clicks || 0),
          impressions: Number(row?.impressions || 0),
          ctr: Number(row?.ctr || 0),
          position: Number(row?.position || 0),
        }))
      : [];

    // ---------- Merge by normalized date ----------
    const map = new Map<string, SeriesRow>();

    for (const r of gaRows) {
      const k = r.date;
      if (!k) continue;
      const existing = map.get(k) || {
        date: k,
        sessions: 0,
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0,
      };
      existing.sessions = Number(r.sessions || 0);
      map.set(k, existing);
    }

    for (const r of gscRows) {
      const k = r.date; // GSC already returns "YYYY-MM-DD"
      if (!k) continue;
      const existing = map.get(k) || {
        date: k,
        sessions: 0,
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0,
      };
      existing.clicks = Number(r.clicks || 0);
      existing.impressions = Number(r.impressions || 0);
      existing.ctr = Number(r.ctr || 0);
      existing.position = Number(r.position || 0);
      map.set(k, existing);
    }

    const series: SeriesRow[] = Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
    return res.status(200).json({ series });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
