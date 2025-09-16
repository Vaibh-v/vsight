// pages/api/gsc/query.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

type Body = {
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimension: "QUERY" | "PAGE";
  rowLimit?: number;
  keyword?: string;
  match?: "contains" | "equals";
  countryCode?: string;
  device?: "DESKTOP" | "MOBILE" | "TABLET" | "";
  sortBy?: "CLICKS" | "IMPRESSIONS" | "CTR" | "POSITION";
  sortDir?: "ASCENDING" | "DESCENDING";
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = await getToken({ req });
    if (!token?.access_token) return res.status(401).json({ error: "Unauthenticated" });

    const {
      siteUrl, startDate, endDate, dimension,
      rowLimit = 25, keyword = "", match = "contains",
      countryCode = "", device = "", sortBy = "CLICKS", sortDir = "DESCENDING",
    } = req.body as Body;

    const body: any = {
      startDate, endDate, searchType: "WEB",
      dimensions: [dimension], rowLimit,
    };

    const filters: any[] = [];
    if (keyword) {
      filters.push({ dimension: "QUERY", operator: match === "equals" ? "EQUALS" : "CONTAINS", expression: keyword });
    }
    if (countryCode) filters.push({ dimension: "COUNTRY", operator: "EQUALS", expression: countryCode.toUpperCase() });
    if (device) filters.push({ dimension: "DEVICE", operator: "EQUALS", expression: device });
    if (filters.length) body.dimensionFilterGroups = [{ filters }];

    if (sortBy) body.orderBy = [{ field: sortBy, direction: sortDir }];

    const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({ error: "GSC error", detail: t });
    }

    const data = await r.json();
    const rows = (data.rows ?? []).map((r: any) => ({
      key: r.keys?.[0] ?? "",
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
    }));

    res.json({ rows });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
}
