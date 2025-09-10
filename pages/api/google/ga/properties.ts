import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gaListProperties } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const list = await gaListProperties(token.access_token as string);
    const properties = (list?.properties || []).map((p: any) => ({
      id: p.id || p.propertyId || p.name?.split("/")[1],
      displayName: p.displayName || p.name || "",
    }));
    res.status(200).json({ properties });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Unexpected error" });
  }
}
