import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gscTopQueries } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req });
    const accessToken = token?.accessToken as string | undefined;
    if (!accessToken) return res.status(401).json({ error: "No Google token" });

    const { siteUrl, startDate, endDate } = req.method === "POST" ? req.body : req.query;
    if (!siteUrl || !startDate || !endDate) return res.status(400).json({ error: "siteUrl, startDate, endDate required" });

    // Current: top movers by click delta vs previous equal window
    const ms = (d: string) => new Date(d + "T00:00:00Z").getTime();
    const spanDays = Math.ceil((ms(String(endDate)) - ms(String(startDate))) / 86400000);
    const prevStart = new Date(ms(String(startDate)) - spanDays * 86400000).toISOString().slice(0,10);
    const prevEnd   = new Date(ms(String(endDate))   - spanDays * 86400000).toISOString().slice(0,10);

    const [curr, prev] = await Promise.all([
      gscTopQueries(accessToken, String(siteUrl), { startDate: String(startDate), endDate: String(endDate), dimension: "query", rowLimit: 50 }),
      gscTopQueries(accessToken, String(siteUrl), { startDate: prevStart, endDate: prevEnd, dimension: "query", rowLimit: 50 }),
    ]);

    const prevMap = new Map(prev.map((r: any) => [r.key, r.clicks]));
    const movers = curr
      .map((r: any) => ({ ...r, deltaClicks: (r.clicks ?? 0) - (prevMap.get(r.key) ?? 0) }))
      .sort((a: any, b: any) => Math.abs(b.deltaClicks) - Math.abs(a.deltaClicks))
      .slice(0, 10);

    const sum = (arr: number[]) => arr.reduce((a,b) => a+b, 0);
    const upDown = (sum(curr.map((x: any) => x.clicks))-sum(prev.map((x: any) => x.clicks)));
    const highlights = [
      `${upDown >= 0 ? "Clicks up" : "Clicks down"} ${Math.abs(upDown)} vs previous period.`,
    ];

    res.status(200).json({ highlights, movers });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Failed to generate insights" });
  }
}
