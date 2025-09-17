import type { Integration, RunContext, RunInput, RunResult } from "../core/types";
import { bearer } from "./auth";
import { getJson, postJson } from "../core/http";

// List verified sites
async function sites(ctx: RunContext) {
  type R = { siteEntry?: { siteUrl: string; permissionLevel: string }[] };
  const r = await getJson<R>("https://www.googleapis.com/webmasters/v3/sites", bearer(ctx));
  return (r.siteEntry ?? [])
    .filter(s => s.permissionLevel !== "siteUnverifiedUser")
    .map(s => ({ id: s.siteUrl, title: s.siteUrl }));
}

// Query Search Analytics
async function query(ctx: RunContext, siteUrl: string, body: any) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  return postJson<any>(url, bearer(ctx), body);
}

export const gsc: Integration = {
  id: "gsc",
  label: "Google Search Console",
  ops: ["gsc.sites", "gsc.topQueries", "gsc.timeseries"],
  async run(ctx: RunContext, input: RunInput): Promise<RunResult> {
    try {
      if (input.op === "gsc.sites") {
        return { ok: true, data: await sites(ctx) };
      }

      if (input.op === "gsc.topQueries") {
        const { siteUrl, dimension = "query", startDate, endDate, rowLimit = 25,
                country, device, keywordMode, keyword, sort = "clicks", dir = "desc" } = input.params || {};

        if (!siteUrl || !startDate || !endDate) return { ok: false, error: "siteUrl, startDate, endDate required" };

        const filters: any[] = [];
        if (country) filters.push({ dimension: "country", operator: "equals", expression: country.toLowerCase() });
        if (device)  filters.push({ dimension: "device", operator: "equals", expression: device.toLowerCase() });
        if (keyword && (dimension === "query" || dimension === "page")) {
          filters.push({ dimension, operator: keywordMode === "equals" ? "equals" : "contains", expression: keyword });
        }

        const body = {
          startDate, endDate,
          dimensions: [dimension],
          rowLimit,
          dimensionFilterGroups: filters.length ? [{ filters }] : undefined,
          orderBy: [{ fieldName: sort, sortOrder: dir === "asc" ? "ASCENDING" : "DESCENDING" }],
        };

        const r = await query(ctx, siteUrl, body);
        const rows = (r.rows ?? []).map((x: any) => ({
          key: (x.keys?.[0] ?? ""),
          clicks: x.clicks ?? 0,
          impressions: x.impressions ?? 0,
          ctr: x.ctr ?? 0,
          position: x.position ?? 0,
        }));
        return { ok: true, data: rows };
      }

      if (input.op === "gsc.timeseries") {
        const { siteUrl, startDate, endDate } = input.params || {};
        if (!siteUrl || !startDate || !endDate) return { ok: false, error: "siteUrl, startDate, endDate required" };
        const r = await query(ctx, siteUrl, {
          startDate, endDate,
          dimensions: ["date"],
          rowLimit: 1000,
          orderBy: [{ fieldName: "date", sortOrder: "ASCENDING" }],
        });
        const labels = (r.rows ?? []).map((x: any) => x.keys?.[0] ?? "");
        const clicks = (r.rows ?? []).map((x: any) => x.clicks ?? 0);
        const impressions = (r.rows ?? []).map((x: any) => x.impressions ?? 0);
        return { ok: true, data: { labels, clicks, impressions } };
      }

      return { ok: false, error: `Unknown GSC op: ${input.op}` };
    } catch (e: any) {
      return { ok: false, error: e?.message || "GSC error" };
    }
  },
};
