import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { gbpListLocations } from "@/lib/google";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.access_token) return res.status(401).json({ error: "Not authenticated" });

    const locations = await gbpListLocations(token.access_token as string);
    res.status(200).json({ locations });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Unexpected error" });
  }
}
