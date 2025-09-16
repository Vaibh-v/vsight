import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

type SearchRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") { res.setHeader("Allow","POST"); return res.status(405).json({ error: "Method not allowed" }); }
  const session = await getServerSession(req, res, authOptions as any);
  const accessToken = (session as any)?.access_token as string | undefined;
  if (!accessToken) return res.status(401).json({ error: "Not authenticated" });

  try {
    const {
      siteUrl, startDate, endDate, rowLimit = 25, startRow = 0,
      country = "", device = "", query = "", queryMatch = "contains",
      dimension = "query", sortBy = "clicks", sortDir = "desc",
    } = req.body ?? {};

    if (!siteUrl) return res.status(400).json({ error: "Missing siteUrl" });

    const body: any = {
      startDate: startDate ?? new Date(Date.now() - 27*86400000).toISOString().slice(0,10),
      endDate: endDate ?? new Date().toISOString().slice(0,10),
      dimensions: [dimension],
      rowLimit: Math.min(1000, Math.max(1, Number(rowLimit))),
      startRow: Math.max(0, Number(startRow)),
      dataState: "all",
    };

    const filters: any[] = [];
    if (country) filters.push({ dimension: "country", operator: "equals", expression: country }); // already COUNTRY_XX
    if (device) filters.push({ dimension: "device", operator: "equals", expression: String(device).toUpperCase() });
    if (query) filters.push({ dimension: "query", operator: queryMatch === "equals" ? "equals" : "contains", expression: String(query) });
    if (filters.length) body.dimensionFilterGroups = [{ groupType: "and", filters }];

    const api = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
    const r = await fetch(api, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const text = await r.text();
    const j = text && text.startsWith("{") ? JSON.parse(text) : {};
    if (!r.ok) return res.status(r.status).json({ error: (j as any)?.error?.message || text || "GSC query failed" });

    const rows = (j as any).rows?.map((row: any) => ({
      key: row.keys?.[0] ?? "(not set)",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    })) ?? [];

    const dir = String(sortDir).toLowerCase() === "asc" ? 1 : -1;
    rows.sort((a:any,b:any)=> (a[sortBy] === b[sortBy] ? 0 : a[sortBy] > b[sortBy] ? 1 : -1) * dir);
    return res.status(200).json({ rows });
  } catch (e:any) {
    console.error("tracker/run error", e);
    return res.status(500).json({ error: e?.message || "Internal error" });
  }
}
