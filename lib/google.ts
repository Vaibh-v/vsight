// /lib/google.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";

// IMPORTANT: adjust this import if your auth file lives elsewhere
import { authOptions } from "../pages/api/auth/[...nextauth]";

/**
 * Returns the Google OAuth access token from the NextAuth session.
 * Throws actionable errors so your API routes can surface them to the UI.
 */
export async function getAccessToken(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<string> {
  const session = await getServerSession(req, res, authOptions as any);

  if (!session) {
    throw new Error("No session. Please sign out and sign in again.");
  }

  // Common locations people put the token:
  const token =
    // put your preferred location first if you store it elsewhere
    (session as any).accessToken ||
    (session as any).token?.access_token ||
    (session as any).user?.accessToken;

  if (!token) {
    throw new Error(
      "No Google access token on session. Reconnect Google (sign out/in)."
    );
  }
  return String(token);
}

/**
 * Helper to forward Google API errors with raw text.
 */
export async function forwardJsonOrText(r: Response) {
  const txt = await r.text();
  try {
    const json = JSON.parse(txt);
    if (!r.ok) {
      throw new Error(
        `HTTP ${r.status} ${r.statusText}: ${JSON.stringify(json).slice(0, 400)}`
      );
    }
    return json;
  } catch {
    if (!r.ok) {
      throw new Error(`HTTP ${r.status} ${r.statusText}: ${txt.slice(0, 400)}`);
    }
    // non-JSON but OK — return raw text
    return txt;
  }
}
