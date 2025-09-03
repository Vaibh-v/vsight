import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

function ymParts(ym: string) {
  const [y, m] = ym.split("-").map((n) => parseInt(n, 10));
  return { year: y, month: m };
}

// businessprofileperformance.locations.listSearchKeywordImpressionsMonthly
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { location, startMonth, endMonth } = req.query;
    if (!location || !startMonth || !endMonth) {
      return res.status(400).json({ error: "location, startMonth (YYYY-MM), endMonth (YYYY-MM) are required" });
    }

    const s = ymParts(String(startMonth));
    const e = ymParts(String(endMonth));

    const base = `https://businessprofileperformance.googleapis.com/v1/${encodeURIComponent(
      String(location)
    )}:listSearchKeywordImpressionsMonthly`;
    const params = new URLSearchParams({
      "monthlyRange.startMonth.year": String(s.year),
      "monthlyRange.startMonth.month": String(s.month),
      "monthlyRange.endMonth.year": String(e.year),
      "monthlyRange.endMonth.month": String(e.month),
      pageSize: "100"
    });

    const r = await fetch(`${base}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });
    const json = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: json.error?.message || "GBP keywords error", raw: json });
    }
    // json.searchKeywords: [{ searchKeyword:{text}, monthlyImpressions:[{month:{year,month}, impressions}] }]
    return res.status(200).json({ searchKeywords: json.searchKeywords || [] });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Unexpected server error" });
  }
}
