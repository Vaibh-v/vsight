import type { Integration, RunContext, RunInput, RunResult } from "../core/types";
export const clarity: Integration = {
  id: "clarity",
  label: "Microsoft Clarity",
  ops: [],
  async run(_ctx: RunContext, _input: RunInput): Promise<RunResult> {
    return { ok: true, data: null };
  },
};
