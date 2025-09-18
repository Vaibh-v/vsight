// lib/google.ts
// Thin backwards-compat layer around the new integrations runtime.
// Exposes the helpers your existing API routes expect so they compile today,
// while we gradually migrate them to runIntegration() calls.

import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { runIntegration } from "./integrations";

export type RunResult = {
  ok: boolean;
  data?: any;
  error?: string;
};

/* -------------------------------------------------------------------------- */
/*  Helpers expected by legacy routes                                         */
/* -------------------------------------------------------------------------- */

/** Read the OAuth access token from NextAuth (throws if missing). */
export async function getAccessToken(req: NextApiRequest): Promise<string> {
  const tok = await getToken({ req });
  const accessToken = (tok as any)?.accessToken;
  if (!accessToken) throw new Error("No Google access token on session");
  return String(accessToken);
}

/**
 * Forward a fetch() Response (or raw data) to the API caller, preserving JSON vs text.
 * Safe to call with: a Response, a JSON object, or a string.
 */
export async function forwardJsonOrText(res: NextApiResponse, payload: any, fallbackStatus = 200) {
  try {
    // If it's a real fetch() Response
    if (payload && typeof payload === "object" && typeof payload.text === "function") {
      const ct = payload.headers?.get?.("content-type") ?? "";
      if (ct.includes("application/json")) {
        const json = await payload.json();
        return res.status(payload.status ?? fallbackStatus).json(json);
      } else {
        const text = await payload.text();
        return res.status(payload.status ?? fallbackStatus).send(text);
      }
    }
  } catch {
    // If parsing fails, continue to generic branch below
  }

  // Generic branch: plain object or string
  if (typeof payload === "string") return res.status(fallbackStatus).send(payload);
  return res.status(fallbackStatus).json(payload);
}

/* -------------------------------------------------------------------------- */
/*  GA4 wrappers (used by dashboard + insight)                                */
/* -------------------------------------------------------------------------- */

export async function gaListProperties(accessToken: string) {
  const r: RunResult = await runIntegration("ga4", { accessToken }, { op: "ga4.properties" });
  if (!r.ok) throw new Error(r.error || "gaListProperties failed");
  return r.data;
}

export async function gaRunReport(
  accessToken: string,
  propertyId: string,
  body: Record<string, any>
) {
  const r: RunResult = await runIntegration("ga4", { accessToken }, {
    op: "ga4.runReport",
    params: { propertyId, body },
  });
  if (!r.ok) throw new Error(r.error || "gaRunReport failed");
  return r.data;
}

/* -------------------------------------------------------------------------- */
/*  GSC wrappers (used by tracker + insight)                                  */
/* -------------------------------------------------------------------------- */

export async function gscSites(accessToken: string) {
  const r: RunResult = await runIntegration("gsc", { accessToken }, { op: "gsc.sites" });
  if (!r.ok) throw new Error(r.error || "gscSites failed");
  return r.data; // array of { id, title }
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
  return r.data; // normalized rows
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
  return r.data; // normalized daily clicks/impr/ctr/pos
}

/* -------------------------------------------------------------------------- */
/*  Drive/Sheets stubs (compile-safe today; wire later in Settings)           */
/* -------------------------------------------------------------------------- */

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
