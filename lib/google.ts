// Backwards-compat wrappers over the new integrations layer
// Keep this thin so older pages keep working while we migrate.

import { runIntegration } from "./integrations";
import type { RunResult } from "./integrations";

/** GA4 */
export async function gaListProperties(accessToken: string) {
  const r: RunResult = await runIntegration("ga4", { accessToken }, { op: "ga4.properties" });
  if (!r.ok) throw new Error(r.error || "gaListProperties failed");
  return r.data;
}

export async function gaRunReport(accessToken: string, propertyId: string, body: Record<string, any>) {
  const r: RunResult = await runIntegration("ga4", { accessToken }, {
    op: "ga4.runReport",
    params: { propertyId, body },
  });
  if (!r.ok) throw new Error(r.error || "gaRunReport failed");
  return r.data;
}

/** GSC */
export async function gscSites(accessToken: string) {
  const r: RunResult = await runIntegration("gsc", { accessToken }, { op: "gsc.sites" });
  if (!r.ok) throw new Error(r.error || "gscSites failed");
  return r.data;
}

export async function gscTopQueries(
  accessToken: string,
  siteUrl: string,
  params: {
    dimension?: string;
    startDate: string;
    endDate: string;
    rowLimit?: number;
    country?: string;
    device?: string;
    keywordMode?: "contains" | "equals";
    keyword?: string;
    sort?: string;
    dir?: "asc" | "desc";
  }
) {
  const r: RunResult = await runIntegration("gsc", { accessToken }, {
    op: "gsc.topQueries",
    params: { siteUrl, ...params },
  });
  if (!r.ok) throw new Error(r.error || "gscTopQueries failed");
  return r.data;
}

export async function gscTimeseries(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string
) {
  const r: RunResult = await runIntegration("gsc", { accessToken }, {
    op: "gsc.timeseries",
    params: { siteUrl, startDate, endDate },
  });
  if (!r.ok) throw new Error(r.error || "gscTimeseries failed");
  return r.data;
}

/** Google Drive / Sheets — stubs for now so pages compile.
 *  We’ll swap these with real implementations when we wire Settings.
 */
export async function driveFindOrCreateSpreadsheet(
  _token: string,
  _title: string
): Promise<{ id: string; url: string }> {
  return { id: "", url: "" };
}

export async function sheetsAppend(
  _token: string,
  _spreadsheetId: string,
  _range: string,
  _values: any[][]
): Promise<{ ok: boolean }> {
  return { ok: true };
}

export async function sheetsGet(
  _token: string,
  _spreadsheetId: string,
  _range: string
): Promise<{ values: any[][] }> {
  return { values: [] };
}
