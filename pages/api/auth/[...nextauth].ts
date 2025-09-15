import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  // GA4 (Admin + Data)
  "https://www.googleapis.com/auth/analytics.readonly",
  // GSC
  "https://www.googleapis.com/auth/webmasters.readonly",
  // Drive / Sheets (optional: exports, vault)
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets",
  // ✅ GBP (Business Profile)
  "https://www.googleapis.com/auth/business.manage",
].join(" ");

async function refreshGoogleAccessToken(token: any) {
  try {
    const url =
      "https://oauth2.googleapis.com/token?" +
      new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refresh_token as string,
      });

    const refreshed = await fetch(url, { method: "POST" }).then((r) => r.json());

    if (!refreshed.access_token) {
      throw new Error(JSON.stringify(refreshed));
    }

    return {
      ...token,
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? token.refresh_token,
      accessTokenExpires: Date.now() + (refreshed.expires_in ?? 3600) * 1000, // 1h
    };
  } catch (err) {
    console.error("Failed to refresh Google access token", err);
    return { ...token, error: "RefreshAccessTokenError" as const };
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
          // Make sure we get a refresh_token on first consent
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in
      if (account?.access_token) {
        token.access_token = account.access_token;
        token.refresh_token = account.refresh_token ?? token.refresh_token;
        token.accessTokenExpires =
          Date.now() + ((account.expires_in ?? 3600) * 1000);
        return token;
      }

      // If the access token is still valid, return it
      if (token.accessTokenExpires && Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Access token has expired, try to refresh it
      if (token.refresh_token) {
        return await refreshGoogleAccessToken(token);
      }

      // No refresh token available — leave token as-is (will force re-auth on use)
      return token;
    },
    async session({ session, token }) {
      (session as any).access_token = token.access_token;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
