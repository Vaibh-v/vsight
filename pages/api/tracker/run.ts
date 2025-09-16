import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

type SearchRow = {
  keys: string[]; clicks: number; impressions: number; ctr: number; position: number;
};

function normalizeCountry(input?: string): string | undefined {
  if (!input) return undefined;
  const s = input.trim().toUpperCase();
  if (!s) return undefined;
  if (s.startsWith("COUNTRY_")) return s;         // already in GSC format
  const map: Record<string, string> = {
    US: "COUNTRY_US", USA: "COUNTRY_US", "UNITED STATES": "COUNTRY_US", "UNITED STATES OF AMERICA": "COUNTRY_US",
    IN: "COUNTRY_IN", INDIA: "COUNTRY_IN",
    GB: "COUNTRY_GB", UK: "COUNTRY_GB", "UNITED KINGDOM": "COUNTRY_GB",
    CA: "COUNTRY_CA", CANADA: "COUNTRY_CA",
    AU: "COUNTRY_AU", AUSTRALIA: "COUNTRY_AU",
  };
  return map[s] ?? (s.length === 2 ? `COUNTRY_${s}` : undefined);
}

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
      country,
      device,
      query,
      queryMatch = "contains",
      dimension = "query",
      sortBy = "clicks",
      sortDir = "desc",
    } = req.body ?? {};

    if (!siteUrl) return res.status(400).json({ error: "Missing siteUrl" });

    const end = (endDate ?? new Date().toISOString().slice(0, 10));
    const start = (startDate ?? new Date(Date.now() - 27 * 86400000).toISOString().slice(0, 10));

    const filters: any[] = [];
    const normCountry = normalizeCountry(country);
    if (normCountry) filters.push({ dimension: "country", operator: "equals", expression: normCountry });
    if (device) filters.push({ dimension: "device", operator: "equals", expression: String(device).toUpperCase() });
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
