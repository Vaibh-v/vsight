import type { RunContext, RunInput, RunResult } from "./types";
import { getIntegration } from "./registry";

export async function runIntegration(
  providerId: string,
  ctx: RunContext,
  input: RunInput
): Promise<RunResult> {
  const integ = getIntegration(providerId);
  if (!integ) return { ok: false, error: `Unknown provider: ${providerId}` };
  return integ.run(ctx, input);
}
