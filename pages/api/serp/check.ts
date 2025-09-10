import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { serpCheckBrave } from "@/lib/serp";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

  const { keyword, domain } = req.query as any;
  if (!keyword || !domain) return res.status(400).json({ error: "Missing keyword/domain" });

  if ((process.env.SERP_PROVIDER || "").toLowerCase() !== "brave") {
    return res.status(400).json({ error: "SERP provider not configured" });
  }
  const apiKey = String(process.env.BRAVE_API_KEY || "");
  if (!apiKey) return res.status(400).json({ error: "BRAVE_API_KEY missing" });

  const out = await serpCheckBrave(apiKey, String(keyword), String(domain), 20);
  res.status(200).json(out);
}
