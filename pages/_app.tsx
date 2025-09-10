import type { AppProps } from "next/app";
import { SessionProvider, signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { AppStateProvider } from "@/components/state/AppStateProvider";
import "@/styles/globals.css";

function Nav() {
  const { status, data } = useSession();
  return (
    <header className="border-b">
      <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
        <Link className="font-semibold" href="/">VSight</Link>
        <Link href="/connections">Connections</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/tracker">Organic Tracker</Link>
        <Link href="/insight">AI Insight</Link>
        <div className="ml-auto text-sm flex items-center gap-3">
          {status === "authenticated" ? (
            <>
              <span className="text-gray-600">{data?.user?.email}</span>
              <button onClick={() => signOut()} className="px-2 py-1 border rounded">Sign out</button>
            </>
          ) : (
            <button onClick={() => signIn("google")} className="px-2 py-1 border rounded">Sign in</button>
          )}
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t mt-16">
      <div className="max-w-6xl mx-auto px-4 py-8 text-xs text-gray-600 flex items-center gap-4">
        <span>© 2025 VSight — Unified Analytics</span>
        <span className="ml-auto" />
        <Link className="underline" href="/privacy">Privacy</Link>
        <Link className="underline" href="/terms">Terms</Link>
      </div>
    </footer>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={(pageProps as any).session}>
      <AppStateProvider>
        <Nav />
        <Component {...pageProps} />
        <Footer />
      </AppStateProvider>
    </SessionProvider>
  );
}
