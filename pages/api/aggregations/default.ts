import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gaRunReport, gscTimeseries, gscTopQueries } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req });
    const accessToken = token?.accessToken as string | undefined;
    if (!accessToken) return res.status(401).json({ error: "No Google token" });

    const { propertyId, siteUrl, startDate, endDate } = req.method === "POST" ? req.body : req.query;

    const wantGA = Boolean(propertyId);
    const wantGSC = Boolean(siteUrl);

    const [gaSessions, gaUsers, gscSeries, gscTop] = await Promise.all([
      wantGA
        ? gaRunReport(accessToken, String(propertyId), {
            dimensions: [{ name: "date" }],
            metrics: [{ name: "sessions" }],
            dateRanges: [{ startDate, endDate }],
          })
        : null,
      wantGA
        ? gaRunReport(accessToken, String(propertyId), {
            dimensions: [{ name: "date" }],
            metrics: [{ name: "activeUsers" }],
            dateRanges: [{ startDate, endDate }],
          })
        : null,
      wantGSC ? gscTimeseries(accessToken, String(siteUrl), String(startDate), String(endDate)) : null,
      wantGSC ? gscTopQueries(accessToken, String(siteUrl), {
        startDate: String(startDate),
        endDate: String(endDate),
        dimension: "query",
        rowLimit: 10,
        sort: "clicks",
        dir: "desc",
      }) : null,
    ]);

    // Normalize chart data
    const gaLabels = gaSessions?.rows?.map((r: any) => r?.dimensionValues?.[0]?.value) ?? [];
    const gaSessionsData = gaSessions?.rows?.map((r: any) => Number(r?.metricValues?.[0]?.value || 0)) ?? [];
    const gaUsersData = gaUsers?.rows?.map((r: any) => Number(r?.metricValues?.[0]?.value || 0)) ?? [];

    const response = {
      ga4: wantGA ? {
        labels: gaLabels,
        sessions: gaSessionsData,
        users: gaUsersData,
        topPages: [], // (optional) add later
      } : null,
      gsc: wantGSC ? {
        labels: gscSeries?.labels ?? [],
        clicks: gscSeries?.clicks ?? [],
        impressions: gscSeries?.impressions ?? [],
        topQueries: (gscTop ?? []).slice(0, 10),
      } : null,
    };

    res.status(200).json(response);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Failed to run dashboard aggregation" });
  }
}
