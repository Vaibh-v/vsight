// components/Layout.tsx
import NextLink from "next/link";
import { useRouter } from "next/router";
import TopNavUser from "./TopNavUser";   // keep if you have it (see below)
import IdleLogout from "./IdleLogout";   // keep if you have it (see below)

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const { pathname } = useRouter();
  const active = pathname === href;
  return (
    <NextLink
      href={href}
      className={`text-sm ${active ? "font-semibold" : "text-gray-600 hover:text-gray-900"}`}
    >
      {children}
    </NextLink>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
          <nav className="flex items-center gap-4">
            <NavLink href="/">VSight</NavLink>
            <NavLink href="/connections">Connections</NavLink>
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/tracker">Organic Tracker</NavLink>
            <NavLink href="/ai">AI Insight</NavLink>
          </nav>
          <TopNavUser />
        </div>
      </header>

      {/* optional inactivity sign-out */}
      <IdleLogout minutes={60} />

      <main>{children}</main>

      <footer className="max-w-6xl mx-auto px-4 py-8 text-xs text-gray-500">
        © 2025 VSight · <NextLink href="/privacy">Privacy</NextLink> ·{" "}
        <NextLink href="/terms">Terms</NextLink>
      </footer>
    </div>
  );
}
