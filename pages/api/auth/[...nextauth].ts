import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export default NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/webmasters",
            "https://www.googleapis.com/auth/analytics.readonly",
            "https://www.googleapis.com/auth/drive",
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/business.manage"
          ].join(" ")
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Persist Google tokens on first sign-in / refresh
      if (account) {
        (token as any).access_token = account.access_token;
        (token as any).refresh_token = account.refresh_token;
        (token as any).expires_at = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose access token to the client / API routes if needed
      (session as any).access_token = (token as any).access_token;
      (session as any).expires_at = (token as any).expires_at;
      return session;
    }
  }
});
