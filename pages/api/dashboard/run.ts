import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions as any);
  const accessToken = (session as any)?.access_token as string | undefined;
  if (!accessToken) return res.status(401).json({ error: "Not authenticated" });

  const { gaProperty, gscSite, start, end } = req.body ?? {};
  const out: any = {};

  try {
    if (gaProperty) {
      // GA4: metrics by day
      const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(gaProperty)}:runReport`;
      const r = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: "date" }],
          metrics: [
            { name: "sessions" },
            { name: "activeUsers" },
            { name: "engagedSessions" },
            { name: "eventCount" },
          ],
          orderBys: [{ dimension: { dimensionName: "date" } }],
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error?.message || "GA4 report failed");

      const series = (j.rows ?? []).map((row: any) => ({
        date: row.dimensionValues?.[0]?.value ?? "",
        sessions: Number(row.metricValues?.[0]?.value ?? 0),
        users: Number(row.metricValues?.[1]?.value ?? 0),
        engaged: Number(row.metricValues?.[2]?.value ?? 0),
        events: Number(row.metricValues?.[3]?.value ?? 0),
      }));

      // Top pages
      const r2 = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "sessions" }],
          limit: 10,
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        }),
      });
      const j2 = await r2.json();
      const topPages = (j2.rows ?? []).map((row: any) => ({
        path: row.dimensionValues?.[0]?.value ?? "",
        sessions: Number(row.metricValues?.[0]?.value ?? 0),
      }));

      out.ga = { series, topPages };
    }

    if (gscSite) {
      // GSC: clicks by date
      const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(gscSite)}/searchAnalytics/query`;
      const dayRes = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: start, endDate: end,
          dimensions: ["date"],
          rowLimit: 1000,
        }),
      });
      const jd = await dayRes.json();
      if (!dayRes.ok) throw new Error(jd?.error?.message || "GSC report failed");
      const series = (jd.rows ?? []).map((row: any) => ({
        date: row.keys?.[0] ?? "", clicks: Number(row.clicks ?? 0), impressions: Number(row.impressions ?? 0),
      }));

      // Top queries
      const tqRes = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: start, endDate: end,
          dimensions: ["query"], rowLimit: 10,
        }),
      });
      const tq = await tqRes.json();
      const topQueries = (tq.rows ?? []).map((row: any) => ({
        query: row.keys?.[0] ?? "",
        clicks: Number(row.clicks ?? 0),
        impressions: Number(row.impressions ?? 0),
        ctr: Number(row.ctr ?? 0),
        position: Number(row.position ?? 0),
      }));

      out.gsc = { series, topQueries };
    }

    return res.status(200).json(out);
  } catch (e: any) {
    console.error("dashboard/run error", e);
    return res.status(500).json({ error: e?.message || "Internal error" });
  }
}
