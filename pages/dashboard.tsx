import * as React from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import GSCSitePicker from "@/components/GSCSitePicker";

type GAProperty = { name: string; propertyId: string; displayName?: string };

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [gaProps, setGaProps] = React.useState<GAProperty[]>([]);
  const [gaProp, setGaProp] = React.useState<string>("");
  const [gscSite, setGscSite] = React.useState<string>("");
  const [start, setStart] = React.useState<string>(() => new Date(Date.now() - 27 * 86400000).toISOString().slice(0, 10));
  const [end, setEnd] = React.useState<string>(() => new Date().toISOString().slice(0, 10));
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [gaSeries, setGaSeries] = React.useState<{ date: string; sessions: number }[]>([]);
  const [gscSeries, setGscSeries] = React.useState<{ date: string; clicks: number }[]>([]);

  React.useEffect(() => {
    (async () => {
      if (!session) return;
      try {
        const r = await fetch("/api/google/ga/properties");
        const j = await r.json();
        if (r.ok) setGaProps(j.properties ?? []);
      } catch {}
    })();
  }, [session]);

  async function run() {
    try {
      setLoading(true);
      setErr(null);
      setGaSeries([]);
      setGscSeries([]);

      const res = await fetch("/api/dashboard/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gaProperty: gaProp || null, gscSite: gscSite || null, start, end }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Run failed");
      setGaSeries(j.ga?.series ?? []);
      setGscSeries(j.gsc?.series ?? []);
    } catch (e: any) {
      setErr(e?.message || "Run failed");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") return <div className="p-6">Loading…</div>;
  if (!session)
    return (
      <main className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold">Default Dashboard</h1>
          <button className="px-3 py-2 border rounded" onClick={() => signIn("google")}>
            Sign in with Google
          </button>
        </div>
      </main>
    );

  return (
    <main className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">Default Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{session.user?.email}</span>
          <button className="px-3 py-2 border rounded" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end mb-3">
        {/* GA4 Property */}
        <div>
          <label className="block text-sm mb-1">GA4 Property (optional)</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={gaProp}
            onChange={(e) => setGaProp(e.target.value)}
          >
            <option value="">— Not using GA4 —</option>
            {gaProps.map((p) => (
              <option key={p.propertyId} value={p.propertyId}>
                {p.displayName || p.name} (ID: {p.propertyId})
              </option>
            ))}
          </select>
        </div>

        {/* GSC Site */}
        <div>
          <label className="block text-sm mb-1">GSC Site (optional)</label>
          <GSCSitePicker value={gscSite} onChange={setGscSite} placeholder="— Not using GSC —" />
        </div>

        {/* Dates */}
        <div>
          <label className="block text-sm mb-1">Start</label>
          <input type="date" className="border rounded px-3 py-2" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">End</label>
          <input type="date" className="border rounded px-3 py-2" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>

      <button onClick={run} disabled={loading} className="bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50">
        {loading ? "Running…" : "Run"}
      </button>

      {err && <div className="mt-3 text-sm text-red-600">{err}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <div className="border rounded p-3">
          <div className="font-medium mb-2">GA4 Sessions (by day)</div>
          {gaSeries.length === 0 ? (
            <div className="text-sm text-gray-500">No GA data</div>
          ) : (
            <ul className="text-sm">
              {gaSeries.map((d) => (
                <li key={d.date} className="flex justify-between border-b py-1">
                  <span>{d.date}</span><span>{d.sessions}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border rounded p-3">
          <div className="font-medium mb-2">GSC Clicks (by day)</div>
          {gscSeries.length === 0 ? (
            <div className="text-sm text-gray-500">No GSC data</div>
          ) : (
            <ul className="text-sm">
              {gscSeries.map((d) => (
                <li key={d.date} className="flex justify-between border-b py-1">
                  <span>{d.date}</span><span>{d.clicks}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
