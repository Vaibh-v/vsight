import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

// Normalizes country handling: "ALL" = no filter.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { siteUrl, startDate, endDate, country = "ALL", rowLimit = 250 } = req.body || {};
    if (!siteUrl || !startDate || !endDate) {
      return res.status(400).json({ error: "siteUrl, startDate, endDate are required" });
    }

    const body: any = {
      startDate,
      endDate,
      dimensions: ["query"],
      rowLimit
    };

    if (country && country !== "ALL") {
      body.dimensionFilterGroups = [
        {
          filters: [
            {
              dimension: "country",
              operator: "equals",
              expression: String(country).toUpperCase()
            }
          ]
        }
      ];
    }

    const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      siteUrl
    )}/searchAnalytics/query`;

    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const json = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: json.error?.message || "GSC API error", raw: json });
    }
    // rows: [{ keys:["query"], clicks, impressions, ctr, position }]
    return res.status(200).json({ rows: json.rows || [] });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Unexpected server error" });
  }
}
