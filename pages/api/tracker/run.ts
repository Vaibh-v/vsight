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
    const { siteUrl, startDate, endDate } = req.body ?? {};
    if (!siteUrl) return res.status(400).json({ error: "Missing siteUrl" });

    // default to last 28 days
    const end = endDate ?? new Date().toISOString().slice(0, 10);
    const start = startDate ?? new Date(Date.now() - 27 * 86400000).toISOString().slice(0, 10);

    const api = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      siteUrl
    )}/searchAnalytics/query`;

    const r = await fetch(api, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: start,
        endDate: end,
        dimensions: ["query"],
        rowLimit: 10,
        startRow: 0,
        dataState: "all", // include fresh data when available
      }),
    });

    const j = (await r.json()) as { rows?: SearchRow[]; error?: any };
    if (!r.ok) {
      return res.status(r.status).json({ error: j?.error?.message || "GSC query failed" });
    }

    const rows =
      (j.rows ?? []).map((row) => ({
        query: row.keys?.[0] ?? "(not set)",
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        ctr: row.ctr ?? 0,
        position: row.position ?? 0,
      })) ?? [];

    return res.status(200).json({ start, end, rows });
  } catch (e: any) {
    console.error("tracker/run error", e);
    return res.status(500).json({ error: e?.message || "Internal error" });
  }
}
