import type { Integration, RunContext, RunInput, RunResult } from "../core/types";
export const semrush: Integration = {
  id: "semrush",
  label: "Semrush",
  ops: [],
  async run(_ctx: RunContext, _input: RunInput): Promise<RunResult> {
    return { ok: true, data: null };
  },
};
