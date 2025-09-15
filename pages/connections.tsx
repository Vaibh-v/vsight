import * as React from "react";
import { useSession, signIn, signOut } from "next-auth/react";

export default function ConnectionsPage() {
  const { data: session, status } = useSession();
  const [gbpMsg, setGbpMsg] = React.useState<string>("");

  async function testGBP() {
    setGbpMsg("Checking GBP…");
    try {
      const r = await fetch("/api/google/gbp/locations");
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed to fetch GBP locations");
      const count = Array.isArray(j)
        ? j.length
        : Array.isArray(j?.locations)
        ? j.locations.length
        : 0;
      setGbpMsg(`GBP connected. Locations found: ${count}`);
    } catch (e: any) {
      setGbpMsg(e?.message || "Failed to load GBP");
    }
  }

  if (status === "loading") {
    return <div className="p-6">Loading…</div>;
  }

  if (!session) {
    return (
      <main className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold">Connections</h1>
          <button
            className="px-3 py-2 border rounded"
            onClick={() => signIn("google")}
          >
            Sign in with Google
          </button>
        </div>
        <p>Sign in to connect Google Analytics, Search Console, and GBP.</p>
      </main>
    );
  }

  return (
    <main className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">Connections</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{session.user?.email}</span>
          <button className="px-3 py-2 border rounded" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </div>

      <section className="space-y-4">
        <div className="border rounded p-4">
          <div className="font-medium mb-1">Google Analytics (GA4)</div>
          <p className="text-sm text-gray-600">
            GA4 permissions are granted when you sign in. Use the Dashboard to select a property.
          </p>
        </div>

        <div className="border rounded p-4">
          <div className="font-medium mb-1">Google Search Console (GSC)</div>
          <p className="text-sm text-gray-600">
            GSC permissions are granted when you sign in. Use the Organic Tracker to select a site.
          </p>
        </div>

        <div className="border rounded p-4">
          <div className="font-medium mb-2">Google Business Profile (GBP)</div>
          <div className="flex gap-2 items-center">
            <button className="px-3 py-2 border rounded" onClick={testGBP}>
              Test GBP connection
            </button>
            {gbpMsg && <span className="text-sm text-gray-700">{gbpMsg}</span>}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Requires scope <code>business.manage</code> and the Business Profile APIs enabled.
          </p>
        </div>
      </section>
    </main>
  );
}
