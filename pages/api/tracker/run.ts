import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { driveFindOrCreateSpreadsheet, sheetsAppend, gscTopQueries, serpTopUrl } from "@/lib/google";

function iso(d: string | Date) { return new Date(d).toISOString().slice(0,10); }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const body = (req.body || {}) as any;
    const email = String(token.email || "user");
    const siteUrl = String(body.siteUrl || "");
    const range = body.range || { startDate: body.start || body.startDate, endDate: body.end || body.endDate };
    const keywords: string[] = Array.isArray(body.keywords) ? body.keywords : [];
    const location = String(body.location || "");
    const topN: number = Number(body.topN || 100);
    if (!siteUrl || !range?.startDate || !range?.endDate) return res.status(400).json({ error: "Missing siteUrl/range" });

    const { rows } = await gscTopQueries(String(token.access_token), siteUrl, {
      startDate: iso(range.startDate),
      endDate: iso(range.endDate),
      rowLimit: topN,
      dimensions: ["query"],
      type: "web",
    });

    // optional keyword filtering
    const filtered = keywords.length
      ? rows.filter(r => keywords.some(k => r.query.toLowerCase().includes(String(k).toLowerCase())))
      : rows;

    const key = `${email}|${siteUrl}|${range.startDate}|${range.endDate}|${(keywords||[]).join("|")}|${location}|${topN}`;
    const values: any[][] = [];
    for (const r of filtered.slice(0, 1000)) {
      const topUrl = await serpTopUrl(r.query);
      values.push([iso(range.endDate), siteUrl, r.query, r.page || "", r.position, r.clicks, r.impressions, location || "", topUrl, key]);
    }

    const { id: spreadsheetId } = await driveFindOrCreateSpreadsheet(String(token.access_token), `VSight_${email}`);
    if (values.length) await sheetsAppend(String(token.access_token), spreadsheetId, "Tracker", values);

    return res.status(200).json({
      ok: true,
      appended: values.length,
      message: `Tracker: appended ${values.length} row(s) for ${siteUrl} (${range.startDate}..${range.endDate})`,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
