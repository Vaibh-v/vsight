import type { NextApiRequest, NextApiResponse } from "next";
import { gaListProperties } from "@/lib/google";
import { getToken } from "next-auth/jwt";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const accessToken = (token as any)?.access_token as string | undefined;
    if (!accessToken) return res.status(401).json({ error: "No Google token" });

    const data = await gaListProperties(accessToken);
    res.status(200).json({ accountSummaries: data });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Failed to list GA4 account summaries" });
  }
}
