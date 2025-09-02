import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { propertyId, start, end } = req.query as any;
    if (!propertyId || !start || !end) return res.status(400).json({ error: "Missing propertyId/start/end" });
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
    const body = { dimensions: [{ name: "date" }], metrics: [{ name: "sessions" }], dateRanges: [{ startDate: start, endDate: end }] };
    const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: j.error?.message || "GA4 error" });

    const rows = (j.rows ?? []).map((x: any) => ({ date: x.dimensionValues?.[0]?.value, sessions: Number(x.metricValues?.[0]?.value ?? 0) }));
    res.status(200).json({ rows });
  } catch (e: any) { res.status(500).json({ error: e.message || "Server error" }); }
}
