import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gscTopQueries, serpTopUrl, driveFindOrCreateSpreadsheet, sheetsAppend } from "@/lib/google";

function iso(s: string) { return new Date(s).toISOString().slice(0,10); }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const {
      siteUrl,
      range,            // { startDate, endDate }
      keywords = [],    // string[]
      location = "",
      topN = 50,
      serpKey = false,  // whether to enrich SERP urls (kept for compatibility)
    } = (req.body || {}) as any;

    if (!siteUrl || !range?.startDate || !range?.endDate)
      return res.status(400).json({ error: "Missing siteUrl or range.startDate/range.endDate" });

    // Fetch top queries (filter by optional keywords)
    const all = await gscTopQueries(String(token.access_token), String(siteUrl), {
      startDate: String(range.startDate),
      endDate: String(range.endDate),
      rowLimit: 1000,
      type: "web",
    });

    const filtered = (Array.isArray(keywords) && keywords.length)
      ? all.filter((r: any) => keywords.some((k: string) => String(r.query || "").toLowerCase().includes(k.toLowerCase())))
      : all;

    const end = range.endDate;
    const email = String(token.email || "user");
    const key = `${email}|${siteUrl}|${range.startDate}|${range.endDate}|${(keywords||[]).join("|")}|${location}|${topN}`;

    const values: any[][] = [];
    for (const r of filtered.slice(0, Number(topN) || 50)) {
      const topUrl = serpKey ? await serpTopUrl(r.query) : "";
      values.push([iso(end), siteUrl, r.query, r.page || "", r.position || 0, r.clicks || 0, r.impressions || 0, location || "", topUrl, key]);
    }

    const spreadsheetId = await driveFindOrCreateSpreadsheet(String(token.access_token), `VSight_${email}`);
    if (values.length) await sheetsAppend(String(token.access_token), spreadsheetId, "Tracker", values);

    return res.status(200).json({
      ok: true,
      appended: values.length,
      message: `Tracker: appended ${values.length} row(s) for ${siteUrl} (${range.startDate}..${range.endDate})` + (serpKey ? "" : " — SERP snapshots skipped"),
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
