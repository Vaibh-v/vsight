import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { driveFindOrCreateSpreadsheet, sheetsAppend, gscTopQueries, serpTopUrl } from "@/lib/google";

function iso(d?: string | Date) {
  if (!d) return new Date().toISOString().slice(0,10);
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toISOString().slice(0,10);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { siteUrl, startDate, endDate, keywords, location, topN } = (req.body || {}) as {
      siteUrl: string;
      startDate: string;
      endDate: string;
      keywords?: string[];
      location?: string;
      topN?: number;
    };
    if (!siteUrl || !startDate || !endDate) return res.status(400).json({ error: "Missing siteUrl/startDate/endDate" });

    const email = String((token as any).email || "user");
    const start = iso(startDate);
    const end = iso(endDate);
    const limit = Number(topN || 10);

    const all = await gscTopQueries(String(token.access_token), siteUrl, start, end, 1000);
    const filtered = (keywords && keywords.length)
      ? all.filter(r => keywords.some(k => r.query.toLowerCase().includes(k.toLowerCase())))
      : all;

    const key = `${email}|${siteUrl}|${start}|${end}|${(keywords||[]).join("|")}|${location||""}|${limit}`;
    const values: any[][] = [];
    for (const r of filtered.slice(0, Math.max(1, limit))) {
      const topUrl = await serpTopUrl(r.query);
      values.push([end, siteUrl, r.query, "", r.position, r.clicks, r.impressions, location || "", topUrl, key]);
    }

    const spreadsheetId = await driveFindOrCreateSpreadsheet(String(token.access_token), `VSight_${email}`);
    if (values.length) await sheetsAppend(String(token.access_token), spreadsheetId, "Tracker", values);

    return res.status(200).json({
      ok: true,
      appended: values.length,
      message: `Tracker: appended ${values.length} row(s) for ${siteUrl} (${start}..${end})`,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
