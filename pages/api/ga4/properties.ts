// pages/api/ga4/properties.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

/**
 * Returns all GA4 properties the signed-in user can access.
 * Shape: { properties: Array<{ propertyId: string; displayName: string; name: string }> }
 *
 * Requirements:
 *  - NextAuth Google provider configured to include the OAuth access token in the JWT
 *    (token.access_token or token.accessToken)
 *  - Google scopes include at least: https://www.googleapis.com/auth/analytics.readonly
 *  - "Analytics Admin API" enabled on your GCP project
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Get the Google OAuth access token from the NextAuth JWT
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const accessToken =
      (token as any)?.access_token || (token as any)?.accessToken || undefined;

    if (!accessToken) {
      return res.status(401).json({ error: "Not authenticated with Google." });
    }

    const props: Array<{ propertyId: string; displayName: string; name: string }> = [];
    let nextPageToken: string | undefined;

    // Use the Analytics Admin API to fetch account summaries (which include GA4 property summaries)
    do {
      const url = new URL(
        "https://analyticsadmin.googleapis.com/v1beta/accountSummaries"
      );
      url.searchParams.set("pageSize", "200");
      if (nextPageToken) url.searchParams.set("pageToken", nextPageToken);

      const resp = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!resp.ok) {
        // Bubble up the Google error body so the UI shows a useful message instead of HTML
        const text = await resp.text();
        return res.status(resp.status).json({ error: `GA Admin API error: ${text}` });
      }

      const data = await resp.json();

      // Each accountSummary contains propertySummaries like: { property: "properties/123456789", displayName: "My App" }
      for (const acc of data.accountSummaries ?? []) {
        for (const p of acc.propertySummaries ?? []) {
          const propertyResource: string = p.property; // e.g. "properties/376596938"
          const propertyId = propertyResource.split("/")[1];
          props.push({
            propertyId,
            displayName: p.displayName,
            name: propertyResource,
          });
        }
      }

      nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    return res.status(200).json({ properties: props });
  } catch (err: any) {
    console.error("GA4 properties error:", err);
    return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
  }
}
