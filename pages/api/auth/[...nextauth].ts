// pages/api/auth/[...nextauth].ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  // Analytics Data API
  "https://www.googleapis.com/auth/analytics.readonly",
  // Search Console
  "https://www.googleapis.com/auth/webmasters.readonly",
  // Drive/Sheets (for settings sheet)
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets",
].join(" ");

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
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
      if (account?.access_token) token.access_token = account.access_token;
      if (account?.refresh_token) token.refresh_token = account.refresh_token;
      return token;
    },
    async session({ session, token }) {
      (session as any).access_token = token.access_token;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
