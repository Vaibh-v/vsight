import type { Integration, RunContext, RunInput, RunResult } from "../core/types";
import { bearer } from "./auth";
import { getJson, postJson } from "../core/http";

// GA4 Admin: list properties
async function listProperties(ctx: RunContext) {
  type R = { properties?: { name: string; displayName: string }[] };
  const url = "https://analyticsadmin.googleapis.com/v1beta/properties?pageSize=200";
  const data = await getJson<R>(url, bearer(ctx));
  return (data.properties ?? []).map(p => ({
    id: p.name.replace("properties/", ""),
    title: `${p.displayName} (ID: ${p.name.replace("properties/", "")})`,
  }));
}

// GA4 Data API: runReport
async function runReport(ctx: RunContext, propertyId: string, body: any) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
  return postJson<any>(url, bearer(ctx), body);
}

export const ga4: Integration = {
  id: "ga4",
  label: "Google Analytics 4",
  ops: ["ga4.properties", "ga4.runReport", "ga4.sessions.timeseries", "ga4.users.timeseries"],
  async run(ctx: RunContext, input: RunInput): Promise<RunResult> {
    try {
      if (input.op === "ga4.properties") {
        return { ok: true, data: await listProperties(ctx) };
      }
      if (input.op === "ga4.runReport") {
        const { propertyId, body } = input.params || {};
        if (!propertyId) return { ok: false, error: "propertyId required" };
        return { ok: true, data: await runReport(ctx, String(propertyId), body || {}) };
      }
      if (input.op === "ga4.sessions.timeseries") {
        const { propertyId } = input.params || {};
        const { startDate, endDate } = input.range || {};
        if (!propertyId || !startDate || !endDate) return { ok: false, error: "propertyId, startDate, endDate required" };
        const r = await runReport(ctx, String(propertyId), {
          dimensions: [{ name: "date" }],
          metrics: [{ name: "sessions" }],
          dateRanges: [{ startDate, endDate }],
        });
        const labels = (r.rows ?? []).map((x: any) => x.dimensionValues[0].value);
        const data = (r.rows ?? []).map((x: any) => Number(x.metricValues[0].value || 0));
        return { ok: true, data: { labels, series: [{ label: "Sessions", data }] } };
      }
      if (input.op === "ga4.users.timeseries") {
        const { propertyId } = input.params || {};
        const { startDate, endDate } = input.range || {};
        if (!propertyId || !startDate || !endDate) return { ok: false, error: "propertyId, startDate, endDate required" };
        const r = await runReport(ctx, String(propertyId), {
          dimensions: [{ name: "date" }],
          metrics: [{ name: "activeUsers" }],
          dateRanges: [{ startDate, endDate }],
        });
        const labels = (r.rows ?? []).map((x: any) => x.dimensionValues[0].value);
        const data = (r.rows ?? []).map((x: any) => Number(x.metricValues[0].value || 0));
        return { ok: true, data: { labels, series: [{ label: "Active Users", data }] } };
      }
      return { ok: false, error: `Unknown GA4 op: ${input.op}` };
    } catch (e: any) {
      return { ok: false, error: e?.message || "GA4 error" };
    }
  },
};
