// lib/integrations/index.ts
export type RunOk = { ok: true; data: any };
export type RunErr = { ok: false; error: string };
export type RunResult = RunOk | RunErr;

/**
 * Integration dispatcher.
 * Replace internals later with real GA4/GSC client calls.
 */
export async function runIntegration(
  provider: "ga4" | "gsc",
  _ctx: { accessToken: string },
  req: { op: string; params?: any }
): Promise<RunResult> {
  try {
    // Temporary dev guard so we know which path is being hit
    return {
      ok: true,
      data: { __provider: provider, __op: req.op, __echo: req.params ?? null },
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || "runIntegration failed" };
  }
}
