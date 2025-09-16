// pages/api/gsc/query.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

type Row = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: { message: "Method not allowed" } });
    }

    const token = await getToken({ req });
    if (!token?.access_token) {
      return res.status(401).json({ error: { message: "Not authenticated" } });
    }

    const {
      siteUrl,
      startDate,
      endDate,
      dimension = "query",
      rowLimit = 25,
      countryCode,
      device,
      keywordMode, // "contains" | "equals"
      keywordValue,
      sortBy = "clicks", // clicks | impressions | ctr | position
      sortDir = "desc",
    } = req.body || {};

    if (!siteUrl || !startDate || !endDate) {
      return res.status(400).json({ error: { message: "siteUrl, startDate, endDate required" } });
    }

    const dimensionFilterGroups: any[] = [];
    const filters: any[] = [];

    if (countryCode) {
      filters.push({ dimension: "country", operator: "equals", expression: countryCode });
    }
    if (device && device !== "ALL") {
      filters.push({ dimension: "device", operator: "equals", expression: device.toUpperCase() });
    }
    if (keywordValue) {
      filters.push({
        dimension: "query",
        operator: keywordMode === "equals" ? "equals" : "contains",
        expression: keywordValue,
      });
    }
    if (filters.length) {
      dimensionFilterGroups.push({ groupType: "and", filters });
    }

    const body = {
      startDate,
      endDate,
      dimensions: [dimension],
      rowLimit,
      ...(dimensionFilterGroups.length ? { dimensionFilterGroups } : {}),
      orderBy: [{
        // Search Console uses "descending" boolean, but v1 has `orderBy` with "descending" flag.
        // We’ll map metrics to proper name:
        // clicks/impressions/ctr/position
        // string from sortBy
        // @ts-ignore
        metric: sortBy,
        descending: String(sortDir || "desc").toLowerCase() !== "asc",
      }],
    };

    const resp = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const ctype = resp.headers.get("content-type") || "";
    if (!resp.ok) {
      const errText = await resp.text();
      const msg = ctype.includes("application/json")
        ? (() => { try { return JSON.parse(errText); } catch { return { error: { message: errText } }; } })()
        : { error: { message: errText.slice(0, 400) } };
      return res.status(resp.status).json(msg);
    }

    const data = await resp.json() as { rows?: Row[] };
    return res.status(200).json({ rows: data.rows || [] });
  } catch (e: any) {
    return res.status(500).json({ error: { message: e?.message || "Server error" } });
  }
}
