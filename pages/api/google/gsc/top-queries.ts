// pages/api/google/gsc/top-queries.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gscTopQueries } from "@/lib/google";

type Row = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  page?: string;
};

function asRows(x: any): Row[] {
  if (!x) return [];
  if (Array.isArray(x)) return x as Row[];
  if (Array.isArray(x.rows)) return x.rows as Row[];
  return [];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const accessToken = String(token?.access_token || "");
    if (!accessToken) return res.status(401).json({ error: "Not authenticated" });

    const { siteUrl, start, end, limit } = req.query as {
      siteUrl?: string;
      start?: string;
      end?: string;
      limit?: string;
    };

    if (!siteUrl) {
      return res.status(400).json({ error: "Missing siteUrl" });
    }

    const endDate =
      end || new Date().toISOString().slice(0, 10);
    const startDate =
      start ||
      new Date(Date.now() - 27 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // lib/google.gscTopQueries now accepts { startDate, endDate, limit }
    const raw = await gscTopQueries(accessToken, String(siteUrl), {
      startDate,
      endDate,
      limit: limit ? Number(limit) : 10,
    });

    const rows = asRows(raw);

    return res.status(200).json({ rows });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
