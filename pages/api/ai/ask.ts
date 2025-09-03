import type { NextApiRequest, NextApiResponse } from "next";

// Stub for now; we’ll wire OpenRouter in the next patch.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    let prompt = "";
    try {
      prompt = JSON.parse(req.body || "{}").prompt || "";
    } catch {}
    return res.status(200).json({
      text:
        prompt?.length
          ? `Thanks! I’ll soon analyze your connected data for: “${prompt}”.`
          : "Ask me about drops/spikes, Top keywords, or GBP trends. (Full AI coming in the next patch.)"
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Unexpected server error" });
  }
}
