import type { NextApiRequest, NextApiResponse } from "next";
function heuristicSummary(rows: any[]) {
  if (!rows?.length) return "No data available for the selected period.";
  const sessions = rows.map((r) => r.sessions ?? 0);
  const clicks = rows.map((r) => r.clicks ?? 0);
  const sTot = sessions.reduce((s, x) => s + x, 0);
  const cTot = clicks.reduce((s, x) => s + x, 0);
  const sFirst = sessions.slice(0, Math.floor(sessions.length / 2)).reduce((s, x) => s + x, 0);
  const trend = sTot - sFirst > sFirst ? "upward" : sTot - sFirst < sFirst ? "downward" : "flat";
  return `Sessions ${sTot.toLocaleString()}, clicks ${cTot.toLocaleString()}. Trend looks ${trend}.`;
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const rows = (req.body?.rows || []) as any[];
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(200).json({ summary: heuristicSummary(rows), source: "heuristic" });
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "openrouter/auto",
        messages: [{ role: "user", content: `Summarize daily analytics: trend, anomalies, suggested action, <120 words.\n${JSON.stringify(rows).slice(0,12000)}`}],
        max_tokens: 250, temperature: 0.3,
      }),
    });
    const j = await r.json();
    const content = j?.choices?.[0]?.message?.content ?? heuristicSummary(rows);
    res.status(200).json({ summary: content, source: "ai" });
  } catch (e: any) { res.status(200).json({ summary: heuristicSummary(rows), source: "heuristic" }); }
}
