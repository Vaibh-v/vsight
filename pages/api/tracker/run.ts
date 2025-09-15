import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { driveFindOrCreateSpreadsheet, sheetsAppend, gscTopQueries } from "@/lib/google";

function iso(d: Date | string) {
  return new Date(d).toISOString().slice(0, 10);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const token: any = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const { siteUrl, startDate, endDate, location, topN } = (req.body || {}) as any;
    if (!siteUrl || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing siteUrl/startDate/endDate" });
    }

    const email = String(token.email || "user");
    const start = iso(startDate);
    const end = iso(endDate);
    const limit = Number(topN || 100);

    // fetch top queries
    const queries = await gscTopQueries(String(token.access_token), String(siteUrl), {
      startDate: start,
      endDate: end,
      rowLimit: limit,
    });

    const key = `${email}|${siteUrl}|${start}|${end}|${location || ""}|${limit}`;
    const values: any[][] = [];
    for (const r of queries.slice(0, 1000)) {
      values.push([
        end, siteUrl, r.query || "", r.page || "", r.position || 0,
        r.clicks || 0, r.impressions || 0, location || "", "", key
      ]);
    }

    const { id: spreadsheetId } = await driveFindOrCreateSpreadsheet(
      String(token.access_token),
      `VSight_${email}`
    );
    if (values.length) {
      await sheetsAppend(String(token.access_token), spreadsheetId, "Tracker", values);
    }

    return res.status(200).json({
      ok: true,
      appended: values.length,
      message: `Tracker: appended ${values.length} row(s) for ${siteUrl} (${start}..${end})`,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
