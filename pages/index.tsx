// pages/index.tsx
import Link from "next/link";

export default function Home() {
  const Card = ({ href, title }: { href: string; title: string }) => (
    <Link
      href={href}
      className="block border rounded-lg p-4 hover:bg-gray-50 transition"
    >
      {title}
    </Link>
  );

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">VSight — Unified Analytics</h1>
      <p className="text-gray-600">Connect analytics & marketing accounts. Insights in one place.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card href="/connections" title="Connect Accounts" />
        <Card href="/dashboard" title="Default Dashboard" />
        <Card href="/tracker" title="Organic Tracker" />
        <Card href="/insight" title="Ask AI" />
      </div>
    </main>
  );
}
