// components/Layout.tsx
import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";

// keep this; we add a tiny stub below so it always builds
const RightRailAI = dynamic(() => import("./RightRailAI"), { ssr: false });

export default function Layout({ children }: { children: React.ReactNode }) {
  const r = useRouter();
  const is = (href: string) =>
    r.pathname === href ? "text-black font-semibold" : "text-gray-600 hover:text-black";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-semibold">VSight</Link>
          <nav className="flex gap-6 text-sm">
            <Link href="/connections" className={is("/connections")}>Connections</Link>
            <Link href="/dashboard" className={is("/dashboard")}>Dashboard</Link>
            <Link href="/tracker" className={is("/tracker")}>Organic Tracker</Link>
            <Link href="/ai" className={is("/ai")}>AI Insight</Link>
          </nav>
        </div>
      </header>

      <div className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <main>{children}</main>
          <aside className="hidden lg:block">
            <RightRailAI />
          </aside>
        </div>
      </div>

      <footer className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-4 text-xs text-gray-500 flex gap-4">
          <span>© {new Date().getFullYear()} VSight</span>
          <Link href="/privacy" className="hover:text-black">Privacy</Link>
          <Link href="/terms" className="hover:text-black">Terms</Link>
        </div>
      </footer>
    </div>
  );
}
