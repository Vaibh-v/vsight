import { useSession } from "next-auth/react";

export default function Insight() {
  const { status } = useSession();
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">AI Insight</h1>
      {status !== "authenticated" ? (
        <p>Please sign in on the Connections page.</p>
      ) : (
        <p>Insights are shown inside Dashboard after you select GA4 + GSC + dates. This page is a placeholder route so the nav link works.</p>
      )}
    </main>
  );
}
