import type { RunContext } from "../core/types";

export function bearer(ctx: RunContext) {
  if (!ctx.accessToken) throw new Error("Missing Google access token");
  return { Authorization: `Bearer ${ctx.accessToken}` };
}
