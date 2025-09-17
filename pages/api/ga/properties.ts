import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gaListProperties } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req });
    const accessToken = token?.accessToken as string | undefined;
    if (!accessToken) return res.status(401).json({ error: "No Google token" });
    const props = await gaListProperties(accessToken);
    res.status(200).json({ properties: props });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Failed to list GA4 properties" });
  }
}
