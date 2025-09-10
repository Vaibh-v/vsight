import type { NextApiRequest, NextApiResponse } from "next";
import { pctChange } from "@/lib/util";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { rows } = (await req.json?.()) || (req.body || {}) as any;
    const arr = Array.isArray(rows) ? rows : [];
    if (!arr.length) return res.status(200).json({ summary: "" });

    // last 7 vs prior 7
    const take = (n: number, offset = 0) => arr.slice(Math.max(0, arr.length - n - offset), Math.max(0, arr.length - offset));
    const last7 = take(7);
    const prev7 = take(7, 7);

    const sum = (a: any[], k: string) => a.reduce((s, r) => s + Number(r[k] || 0), 0);
    const clicksNow = sum(last7, "clicks"), clicksPrev = sum(prev7, "clicks");
    const sessionsNow = sum(last7, "sessions"), sessionsPrev = sum(prev7, "sessions");
    const ctrNow = last7.length ? sum(last7, "ctr") / last7.length : 0;
    const ctrPrev = prev7.length ? sum(prev7, "ctr") / prev7.length : 0;

    const parts = [
      `Last 7d: ${sessionsNow} sessions, ${clicksNow} clicks, CTR ${(ctrNow * 100).toFixed(2)}%.`,
      `vs prior 7d: sessions ${pctChange(sessionsNow, sessionsPrev).toFixed(1)}%, clicks ${pctChange(clicksNow, clicksPrev).toFixed(1)}%, CTR ${pctChange(ctrNow, ctrPrev).toFixed(1)}%.`
    ];

    res.status(200).json({ summary: parts.join(" ") });
  } catch {
    res.status(200).json({ summary: "" });
  }
}
