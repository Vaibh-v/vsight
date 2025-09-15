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
      // GA4 Data API: sessions by day
      const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(
        gaProperty
      )}:runReport`;
      const r = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: "date" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ dimension: { dimensionName: "date" } }],
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error?.message || "GA4 report failed");

      const series =
        (j.rows ?? []).map((row: any) => ({
          date: row.dimensionValues?.[0]?.value ?? "",
          sessions: Number(row.metricValues?.[0]?.value ?? 0),
        })) ?? [];
      out.ga = { series };
    }

    if (gscSite) {
      const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
        gscSite
      )}/searchAnalytics/query`;
      const r = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: start,
          endDate: end,
          dimensions: ["date"],
          rowLimit: 1000,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error?.message || "GSC report failed");

      const series =
        (j.rows ?? []).map((row: any) => ({
          date: row.keys?.[0] ?? "",
          clicks: Number(row.clicks ?? 0),
        })) ?? [];
      out.gsc = { series };
    }

    return res.status(200).json(out);
  } catch (e: any) {
    console.error("dashboard/run error", e);
    return res.status(500).json({ error: e?.message || "Internal error" });
  }
}
