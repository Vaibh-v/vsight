import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { location, startMonth, endMonth } = req.query;
  const loc = String(location || "");
  if (!loc) return res.status(400).json({ error: "location is required (e.g., locations/12345678901234567890)" });
  if (!startMonth || !endMonth) return res.status(400).json({ error: "startMonth & endMonth required (YYYY-MM)" });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

  const toMonth = (s: string) => ({ year: +s.slice(0, 4), month: +s.slice(5, 7) });

  const body = {
    monthlyRange: { startMonth: toMonth(String(startMonth)), endMonth: toMonth(String(endMonth)) }
  };

  const url = `https://businessprofileperformance.googleapis.com/v1/${encodeURIComponent(
    loc
  )}:fetchSearchKeywordImpressionsMonthly`;

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const json = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: json.error?.message || "GBP Keywords API error", raw: json });
    return res.status(200).json(json);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Unexpected server error" });
  }
}
