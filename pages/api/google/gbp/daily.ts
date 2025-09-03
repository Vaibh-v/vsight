import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

function toParts(iso: string) {
  const d = new Date(iso);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

// Calls businessprofileperformance.getDailyMetricsTimeSeries once per metric
// and merges results so the client can plot multiple series together.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { location, startDate, endDate, metrics } = req.query;
    if (!location || !startDate || !endDate || !metrics) {
      return res.status(400).json({ error: "location, startDate, endDate, metrics are required" });
    }

    const metricList = String(metrics).split(",").map((s) => s.trim()).filter(Boolean);
    const s = toParts(String(startDate));
    const e = toParts(String(endDate));

    const base = `https://businessprofileperformance.googleapis.com/v1/${encodeURIComponent(
      String(location)
    )}:getDailyMetricsTimeSeries`;

    const all: any[] = [];
    for (const m of metricList) {
      const r = await fetch(base, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          dailyMetric: m,
          dateRange: { startDate: s, endDate: e }
        })
      });
      const json = await r.json();
      if (!r.ok) {
        return res.status(r.status).json({ error: json.error?.message || "GBP daily error", raw: json });
      }
      // json: { timeSeries: { datedValues: [{ date:{y,m,d}, value:number }] }[] }
      const series = (json.timeSeries || []).flatMap((ts: any) =>
        (ts.datedValues || []).map((dv: any) => ({
          date: dv.date,
          value: Number(dv.value || 0)
        }))
      );
      all.push({ dimensions: [{ metric: m }], timeSeries: series });
    }

    return res.status(200).json({ timeSeries: all });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Unexpected server error" });
  }
}
