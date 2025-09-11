// pages/api/tracker/recent.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { driveFindOrCreateSpreadsheet, sheetsGet } from "../../../lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const email = String(token.email || "user");

    // IMPORTANT: destructure the `id` (a string) from the returned object
    const { id: spreadsheetId } = await driveFindOrCreateSpreadsheet(
      String(token.access_token),
      `VSight_${email}`
    );

    // Fetch the last 10 columns from the "Tracker" sheet
    const resp = await sheetsGet(
      String(token.access_token),
      spreadsheetId,
      "Tracker!A:J"
    );

    const values: any[][] = (resp && (resp as any).values) || [];

    const headers = [
      "runDate",
      "siteUrl",
      "query",
      "page",
      "position",
      "clicks",
      "impressions",
      "location",
      "serpTopUrl",
      "key"
    ];

    const rows = values.slice(-100).map((r: any[]) => ({
      runDate: r[0] || "",
      siteUrl: r[1] || "",
      query: r[2] || "",
      page: r[3] || "",
      position: Number(r[4] || 0),
      clicks: Number(r[5] || 0),
      impressions: Number(r[6] || 0),
      location: r[7] || "",
      serpTopUrl: r[8] || "",
      key: r[9] || ""
    }));

    return res.status(200).json({ headers, rows });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
