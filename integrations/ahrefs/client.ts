import type { Integration, RunContext, RunInput, RunResult } from "../core/types";
export const ahrefs: Integration = {
  id: "ahrefs",
  label: "Ahrefs",
  ops: [],
  async run(_ctx: RunContext, _input: RunInput): Promise<RunResult> {
    return { ok: true, data: null };
  },
};
