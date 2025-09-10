import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gaRunReport } from "@/lib/google";

type GAReportRow = {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const { propertyId, start, end } = req.query as {
      propertyId?: string;
      start?: string;
      end?: string;
    };

    if (!propertyId || !start || !end) {
      return res.status(400).json({ error: "Missing params" });
    }

    const rep = await gaRunReport(token.access_token as string, String(propertyId), {
      dimensions: [{ name: "date" }],
      metrics: [{ name: "sessions" }],
      dateRanges: [{ startDate: start, endDate: end }],
    });

    const rows = (rep.rows || []).map((r: GAReportRow) => ({
      date: r.dimensionValues?.[0]?.value || "",
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
    }));

    res.status(200).json({ rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Unexpected error" });
  }
}
