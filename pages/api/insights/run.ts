import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

/** Generates plain-English insights from GA4 + GSC (no external LLM needed). */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions as any);
  const accessToken = (session as any)?.access_token as string | undefined;
  if (!accessToken) return res.status(401).json({ error: "Not authenticated" });

  const { gaProperty, gscSite, start, end } = req.body ?? {};
  const out: any = { data: {} };

  try {
    // Pull the same datasets the dashboard uses
    if (gaProperty) {
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
      }));

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
      out.data.ga = { series, topPages };
    }

    if (gscSite) {
      const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(gscSite)}/searchAnalytics/query`;

      const dayRes = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: start, endDate: end, dimensions: ["date"], rowLimit: 1000 }),
      });
      const jd = await dayRes.json();
      if (!dayRes.ok) throw new Error(jd?.error?.message || "GSC report failed");
      const series = (jd.rows ?? []).map((row: any) => ({
        date: row.keys?.[0] ?? "", clicks: Number(row.clicks ?? 0), impressions: Number(row.impressions ?? 0),
      }));

      const tqRes = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: start, endDate: end, dimensions: ["query"], rowLimit: 10 }),
      });
      const tq = await tqRes.json();
      const topQueries = (tq.rows ?? []).map((row: any) => ({
        query: row.keys?.[0] ?? "",
        clicks: Number(row.clicks ?? 0),
        impressions: Number(row.impressions ?? 0),
        ctr: Number(row.ctr ?? 0),
        position: Number(row.position ?? 0),
      }));
      out.data.gsc = { series, topQueries };
    }

    // Heuristic summaries
    const bullets: string[] = [];
    if (out.data.ga?.series?.length) {
      const s = out.data.ga.series;
      const last = s.at(-1);
      const weekAgo = s.at(-8);
      if (last && weekAgo) {
        const ch = ((last.sessions - weekAgo.sessions) / Math.max(1, weekAgo.sessions)) * 100;
        bullets.push(`Sessions change vs ~1 week prior: ${ch >= 0 ? "+" : ""}${ch.toFixed(1)}%.`);
      }
      const totalUsers = s.reduce((a: number, d: any) => a + d.users, 0);
      const totalSessions = s.reduce((a: number, d: any) => a + d.sessions, 0);
      if (totalSessions) {
        bullets.push(`Avg sessions/user ≈ ${(totalSessions / Math.max(1, totalUsers)).toFixed(2)}.`);
      }
    }
    if (out.data.ga?.topPages?.length) {
      const tp = out.data.ga.topPages[0];
      bullets.push(`Top GA page: ${tp.path} (${tp.sessions} sessions).`);
    }
    if (out.data.gsc?.topQueries?.length) {
      const tq = out.data.gsc.topQueries[0];
      bullets.push(`Top GSC query: “${tq.query}” (clicks ${tq.clicks}, pos ${tq.position.toFixed(1)}).`);
    }

    const summary = bullets.length ? "• " + bullets.join("\n• ") : "No notable changes detected for this range.";
    return res.status(200).json({ summary, data: out.data });
  } catch (e: any) {
    console.error("insight/run error", e);
    return res.status(500).json({ error: e?.message || "Internal error" });
  }
}
