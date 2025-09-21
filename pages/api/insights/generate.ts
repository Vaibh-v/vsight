// pages/api/insights/generate.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { gscTopQueries } from "@/lib/google";

type SortBy = "clicks" | "impressions" | "ctr" | "position";
type SortDir = "asc" | "desc";

type QueryRow = {
  key: string;            // usually the query string
  clicks: number;
  impressions: number;
  ctr: number;            // 0..1
  position: number;
};

/**
 * Build "movers" insight by comparing two periods of GSC query data.
 *
 * Query params:
 *  - siteUrl (required)
 *  - start (current period start, required)
 *  - end (current period end, required)
 *  - prevStart (previous period start, optional; if omitted, uses same-length period before {start})
 *  - prevEnd (previous period end, optional; if omitted, uses day before {start})
 *  - limit (optional, default 250)
 *  - sortBy (optional: clicks|impressions|ctr|position, default "clicks")
 *  - sortDir (optional: asc|desc, default "desc")
 *  - moversLimit (optional, default 25)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      siteUrl,
      start,
      end,
      prevStart,
      prevEnd,
      limit,
      sortBy,
      sortDir,
      moversLimit,
    } = req.query;

    if (!siteUrl || !start || !end) {
      return res.status(400).json({ ok: false, error: "Missing siteUrl/start/end" });
    }

    // Coerce options with sane defaults
    const rowLimit = limit ? Number(limit) : 250;
    const sortBySafe = (String(sortBy || "clicks") as SortBy);
    const sortDirSafe = (String(sortDir || "desc") as SortDir);
    const moversOut = moversLimit ? Number(moversLimit) : 25;

    // If prevStart/prevEnd aren’t provided, derive a same-length previous window.
    const [currStartDate, currEndDate] = [new Date(String(start)), new Date(String(end))];
    const msInDay = 24 * 60 * 60 * 1000;
    const currDays = Math.max(1, Math.round((+currEndDate - +currStartDate) / msInDay) + 1);

    let prevStartStr = String(prevStart || "");
    let prevEndStr = String(prevEnd || "");
    if (!prevStartStr || !prevEndStr) {
      const prevEndDate = new Date(+currStartDate - msInDay);
      const prevStartDate = new Date(+prevEndDate - (currDays - 1) * msInDay);
      prevStartStr = prevStartDate.toISOString().slice(0, 10);
      prevEndStr = prevEndDate.toISOString().slice(0, 10);
    }

    // Fetch both periods in parallel; NOTE: gscTopQueries returns { rows } now.
    const [{ rows: prevRows }, { rows: currRows }] = await Promise.all([
      gscTopQueries(req, String(siteUrl), prevStartStr, prevEndStr, {
        rowLimit,
        sortBy: sortBySafe,
        sortDir: sortDirSafe,
      }),
      gscTopQueries(req, String(siteUrl), String(start), String(end), {
        rowLimit,
        sortBy: sortBySafe,
        sortDir: sortDirSafe,
      }),
    ]);

    // Build quick lookup for previous metrics
    const prevMap = new Map<string, number>(
      (prevRows as QueryRow[]).map((r) => [r.key, r.clicks ?? 0])
    );

    // Compute movers by delta in clicks (absolute magnitude)
    const movers = (currRows as QueryRow[])
      .map((r) => ({
        ...r,
        deltaClicks: (r.clicks ?? 0) - (prevMap.get(r.key) ?? 0),
      }))
      .sort((a, b) => Math.abs(b.deltaClicks) - Math.abs(a.deltaClicks))
      .slice(0, moversOut);

    return res.status(200).json({
      ok: true,
      window: { start: String(start), end: String(end), prevStart: prevStartStr, prevEnd: prevEndStr },
      totals: {
        current: {
          clicks: sumBy(currRows as QueryRow[], "clicks"),
          impressions: sumBy(currRows as QueryRow[], "impressions"),
        },
        previous: {
          clicks: sumBy(prevRows as QueryRow[], "clicks"),
          impressions: sumBy(prevRows as QueryRow[], "impressions"),
        },
      },
      movers,
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || "Failed to generate insights" });
  }
}

function sumBy<T extends Record<string, any>>(rows: T[], key: keyof T) {
  return rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
}
