import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") { res.setHeader("Allow","POST"); return res.status(405).json({ error: "Method not allowed" }); }
  const session = await getServerSession(req, res, authOptions as any);
  const accessToken = (session as any)?.access_token as string | undefined;
  if (!accessToken) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { gaProperty, gscSite, start, end } = req.body ?? {};
    const out: any = { data: {} };

    // GA4 daily
    if (gaProperty) {
      const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(gaProperty)}:runReport`;
      const r = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: "date" }],
          metrics: [{ name: "sessions" }, { name: "activeUsers" }],
          orderBys: [{ dimension: { dimensionName: "date" } }],
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error?.message || "GA4 report failed");
      const series = (j.rows ?? []).map((row:any)=>({
        date: row.dimensionValues?.[0]?.value ?? "",
        sessions: Number(row.metricValues?.[0]?.value ?? 0),
        users: Number(row.metricValues?.[1]?.value ?? 0),
      }));
      out.data.ga = { series };
    }

    // GSC daily + top queries
    if (gscSite) {
      const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(gscSite)}/searchAnalytics/query`;
      const dayRes = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ startDate: start, endDate: end, dimensions: ["date"], rowLimit: 1000 }) });
      const jd = await dayRes.json();
      if (!dayRes.ok) throw new Error(jd?.error?.message || "GSC report failed");
      const series = (jd.rows ?? []).map((row:any)=>({ date: row.keys?.[0] ?? "", clicks: Number(row.clicks ?? 0), impressions: Number(row.impressions ?? 0) }));

      const tqRes = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ startDate: start, endDate: end, dimensions: ["query"], rowLimit: 10 }) });
      const tq = await tqRes.json();
      const topQueries = (tq.rows ?? []).map((row:any)=>({
        query: row.keys?.[0] ?? "", clicks: Number(row.clicks ?? 0), impressions: Number(row.impressions ?? 0), ctr: Number(row.ctr ?? 0), position: Number(row.position ?? 0),
      }));

      out.data.gsc = { series, topQueries };
    }

    // simple bullets
    const bullets:string[] = [];
    const s = out.data.ga?.series ?? [];
    if (s.length > 7) {
      const change = ((s.at(-1).sessions - s.at(-8).sessions) / Math.max(1, s.at(-8).sessions)) * 100;
      bullets.push(`Sessions vs ~1 week prior: ${change >= 0 ? "+" : ""}${change.toFixed(1)}%.`);
    }
    const tq0 = out.data.gsc?.topQueries?.[0];
    if (tq0) bullets.push(`Top query “${tq0.query}” (clicks ${tq0.clicks}, pos ${tq0.position.toFixed(1)}).`);

    res.status(200).json({ summary: bullets.length ? "• " + bullets.join("\n• ") : "No notable changes.", data: out.data });
  } catch (e:any) {
    console.error("insight/run error", e);
    res.status(500).json({ error: e?.message || "Internal error" });
  }
}
