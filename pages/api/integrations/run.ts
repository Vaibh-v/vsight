import type { NextApiRequest, NextApiResponse } from "next";
import { runIntegration } from "../../../integrations/core/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const { provider, ctx, input } = req.body || {};
    const r = await runIntegration(provider, ctx || {}, input || {});
    res.status(r.ok ? 200 : 400).json(r);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Integration error" });
  }
}
