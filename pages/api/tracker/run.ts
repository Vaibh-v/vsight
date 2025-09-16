import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

type SearchRow = {
  keys: string[]; clicks: number; impressions: number; ctr: number; position: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions as any);
  const accessToken = (session as any)?.access_token as string | undefined;
  if (!accessToken) return res.status(401).json({ error: "Not authenticated" });

  try {
    const {
      siteUrl,
      startDate,
      endDate,
      rowLimit = 25,
      startRow = 0,
      country,         // e.g. "USA" (ISO-3166 alpha-3) or "COUNTRY_IN" (GSC format) – we normalize below
      device,          // "DESKTOP" | "MOBILE" | "TABLET"
      query,           // keyword filter string
      queryMatch = "contains", // "contains" | "equals"
      dimension = "query",     // "query" | "page"
      sortBy = "clicks",       // sort client-side
      sortDir = "desc"
    } = req.body ?? {};

    if (!siteUrl) return res.status(400).json({ error: "Missing siteUrl" });

    const end = (endDate ?? new Date().toISOString().slice(0, 10));
    const start = (startDate ?? new Date(Date.now() - 27 * 86400000).toISOString().slice(0, 10));

    // Build filters (GSC v3)
    const filters: any[] = [];
    if (country) {
      // Accept "US" / "USA" / "COUNTRY_US" — normalize to "COUNTRY_XX"
      const cc = String(country).toUpperCase().replace(/^COUNTRY_/, "");
      const alpha2 = cc.length === 2 ? cc : cc === "USA" ? "US" : cc; // minimal normalize
      filters.push({ dimension: "country", operator: "equals", expression: `COUNTRY_${alpha2}` });
    }
    if (device) {
      filters.push({ dimension: "device", operator: "equals", expression: device.toUpperCase() });
    }
    if (query) {
      filters.push({
        dimension: "query",
        operator: queryMatch === "equals" ? "equals" : "contains",
        expression: String(query),
      });
    }

    const body: any = {
      startDate: start,
      endDate: end,
      dimensions: [dimension],
      rowLimit: Math.min(1000, Math.max(1, Number(rowLimit))),
      startRow: Math.max(0, Number(startRow)),
      dataState: "all",
    };
    if (filters.length) body.dimensionFilterGroups = [{ groupType: "and", filters }];

    const api = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
    const r = await fetch(api, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = (await r.json()) as { rows?: SearchRow[]; error?: any };
    if (!r.ok) {
      return res.status(r.status).json({ error: j?.error?.message || "GSC query failed" });
    }

    let rows =
      (j.rows ?? []).map((row) => ({
        key: row.keys?.[0] ?? "(not set)",
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        ctr: row.ctr ?? 0,
        position: row.position ?? 0,
      })) ?? [];

    // client-side sort for convenience
    const dir = String(sortDir).toLowerCase() === "asc" ? 1 : -1;
    rows = rows.sort((a: any, b: any) => {
      const av = a[sortBy as keyof typeof a]; const bv = b[sortBy as keyof typeof b];
      return (av === bv ? 0 : av > bv ? 1 : -1) * dir;
    });

    return res.status(200).json({ start, end, rows });
  } catch (e: any) {
    console.error("tracker/run error", e);
    return res.status(500).json({ error: e?.message || "Internal error" });
  }
}
