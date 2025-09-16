// pages/api/insights.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const token = await getToken({ req });
    if (!token?.access_token) return res.status(401).json({ error: "Unauthenticated" });

    const { siteUrl, startDate, endDate } = req.body as { siteUrl: string; startDate: string; endDate: string };
    if (!siteUrl || !startDate || !endDate) return res.status(400).json({ error: "Missing params" });

    const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
    const base = { startDate, endDate, searchType: "WEB", dimensions: ["DATE"], rowLimit: 25000 };

    const daily = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(base),
    });
    if (!daily.ok) return res.status(daily.status).json({ error: "GSC error", detail: await daily.text() });
    const d = await daily.json();
    const rows = d.rows ?? [];

    const half = Math.floor(rows.length / 2);
    const sum = (a: number, b: number) => a + b;
    const clicks1 = rows.slice(0, half).map((r: any) => r.clicks || 0).reduce(sum, 0);
    const clicks2 = rows.slice(half).map((r: any) => r.clicks || 0).reduce(sum, 0);
    const imps1 = rows.slice(0, half).map((r: any) => r.impressions || 0).reduce(sum, 0);
    const imps2 = rows.slice(half).map((r: any) => r.impressions || 0).reduce(sum, 0);
    const pct = (n: number, p: number) => (p === 0 ? 0 : ((n - p) / p) * 100);

    const bullets = [
      `Clicks ${clicks2 >= clicks1 ? "up" : "down"} ${Math.abs(pct(clicks2, clicks1)).toFixed(1)}% vs previous half.`,
      `Impressions ${imps2 >= imps1 ? "up" : "down"} ${Math.abs(pct(imps2, imps1)).toFixed(1)}% vs previous half.`,
    ];

    const topQueryBody = {
      startDate, endDate, searchType: "WEB", dimensions: ["QUERY"], rowLimit: 10,
      orderBy: [{ field: "CLICKS", direction: "DESCENDING" }],
    };
    const tq = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(topQueryBody),
    });
    const tqj = await tq.json();
    const topQueries = (tqj.rows ?? []).map((r: any) => ({ q: r.keys?.[0] ?? "", clicks: r.clicks ?? 0, ctr: r.ctr ?? 0 }));

    res.json({ bullets, topQueries });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
}
