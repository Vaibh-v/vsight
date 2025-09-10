// components/Layout.tsx
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { status, data } = useSession();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/" className="font-semibold text-lg">VSight</Link>
            <Link href="/connections">Connections</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/tracker">Organic Tracker</Link>
            <Link href="/insight">AI Insight</Link>
          </nav>

          <div className="text-sm">
            {status === "authenticated" ? (
              <div className="flex items-center gap-3">
                <span className="text-gray-600 hidden sm:inline">
                  {data?.user?.email || data?.user?.name || "Signed in"}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="px-3 py-1.5 rounded border"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn("google", { callbackUrl: "/" })}
                className="px-3 py-1.5 rounded border"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between text-sm text-gray-600">
          <span>© {new Date().getFullYear()} VSight — Unified Analytics</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="underline">Privacy</Link>
            <Link href="/terms" className="underline">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
