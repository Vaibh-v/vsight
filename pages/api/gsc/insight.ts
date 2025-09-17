// /pages/api/gsc/insight.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getAccessToken, forwardJsonOrText } from "../../../lib/google";

// POST { siteUrl, start, end }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

    const { siteUrl, start, end } = req.body || {};
    if (!siteUrl || !start || !end)
      return res.status(400).json({ error: "siteUrl, start, end required" });

    const token = await getAccessToken(req, res);
    const base = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      siteUrl
    )}/searchAnalytics/query`;

    const toDays = (s: string, e: string) =>
      Math.max(1, Math.ceil((+new Date(e) - +new Date(s)) / 86400000));

    const days = toDays(start, end);
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - (days - 1));

    const [curR, prevR] = await Promise.all([
      fetch(base, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: start, endDate: end, dimensions: ["query"], rowLimit: 250 }),
      }),
      fetch(base, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: prevStart.toISOString().slice(0, 10),
          endDate: prevEnd.toISOString().slice(0, 10),
          dimensions: ["query"],
          rowLimit: 250,
        }),
      }),
    ]);

    const cur = await forwardJsonOrText(curR);
    const prev = await forwardJsonOrText(prevR);

    const prevMap = new Map<string, number>();
    for (const r of (prev as any).rows ?? []) {
      prevMap.set(r.keys?.[0] ?? "", r.clicks ?? 0);
    }

    const movers =
      (cur as any).rows
        ?.map((r: any) => {
          const q = r.keys?.[0] ?? "";
          const clicks = r.clicks ?? 0;
          return {
            query: q,
            clicks,
            impressions: r.impressions ?? 0,
            ctr: r.ctr ?? 0,
            position: r.position ?? 0,
            dClicks: clicks - (prevMap.get(q) ?? 0),
          };
        })
        .sort((a: any, b: any) => b.dClicks - a.dClicks)
        .slice(0, 10) ?? [];

    const tot = (rows: any[]) =>
      rows?.reduce(
        (a: any, r: any) => {
          a.c += r.clicks ?? 0;
          a.i += r.impressions ?? 0;
          return a;
        },
        { c: 0, i: 0 }
      ) ?? { c: 0, i: 0 };

    const tCur = tot((cur as any).rows ?? []);
    const tPrev = tot((prev as any).rows ?? []);
    const pct = (x: number, y: number) => (!y ? (x ? 100 : 0) : ((x - y) / y) * 100);

    const highlights = [
      `Clicks ${pct(tCur.c, tPrev.c) >= 0 ? "up" : "down"} ${Math.abs(pct(tCur.c, tPrev.c)).toFixed(1)}% vs previous window.`,
      `Impressions ${pct(tCur.i, tPrev.i) >= 0 ? "up" : "down"} ${Math.abs(pct(tCur.i, tPrev.i)).toFixed(1)}% vs previous window.`,
    ];

    res.status(200).json({ highlights, movers });
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "Insight failed" });
  }
}
