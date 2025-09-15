import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

type JwtToken = {
  access_token?: string;
  refresh_token?: string;
  accessTokenExpires?: number;
  error?: string;
  [k: string]: unknown;
};

type GoogleAccount = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number | string;
  expires_at?: number;
  [k: string]: unknown;
};

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  // GA4 (Admin + Data)
  "https://www.googleapis.com/auth/analytics.readonly",
  // GSC
  "https://www.googleapis.com/auth/webmasters.readonly",
  // Drive / Sheets (optional)
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets",
  // GBP
  "https://www.googleapis.com/auth/business.manage",
].join(" ");

async function refreshGoogleAccessToken(token: JwtToken) {
  try {
    const url =
      "https://oauth2.googleapis.com/token?" +
      new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: String(token.refresh_token ?? ""),
      });

    const refreshed = await fetch(url, { method: "POST" }).then((r) => r.json() as Promise<{
      access_token?: string;
      refresh_token?: string;
      expires_in?: number | string;
      [k: string]: unknown;
    }>);

    if (!refreshed.access_token) {
      throw new Error(JSON.stringify(refreshed));
    }

    const expiresInMs = Number(refreshed.expires_in ?? 3600) * 1000;

    return {
      ...token,
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? token.refresh_token,
      accessTokenExpires: Date.now() + expiresInMs,
    } satisfies JwtToken;
  } catch (err) {
    console.error("Failed to refresh Google access token", err);
    return { ...token, error: "RefreshAccessTokenError" } as JwtToken;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: GOOGLE_SCOPES,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      const t = token as JwtToken;
      const a = account as GoogleAccount | null;

      // Initial sign-in
      if (a?.access_token) {
        const expiresInMs = Number(a.expires_in ?? 3600) * 1000;
        t.access_token = a.access_token;
        t.refresh_token = a.refresh_token ?? t.refresh_token;
        t.accessTokenExpires = Date.now() + expiresInMs;
        return t;
      }

      // If still valid, return previous token
      if (t.accessTokenExpires && Date.now() < t.accessTokenExpires) {
        return t;
      }

      // Try to refresh
      if (t.refresh_token) {
        return await refreshGoogleAccessToken(t);
      }

      // No refresh token -> keep token; client will re-auth
      return t;
    },
    async session({ session, token }) {
      (session as any).access_token = (token as JwtToken).access_token;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
