import * as React from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import GSCSitePicker from "@/components/GSCSitePicker";

type Row = { query: string; clicks: number; impressions: number; ctr: number; position: number };

export default function TrackerPage() {
  const { data: session, status } = useSession();
  const [siteUrl, setSiteUrl] = React.useState("");
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function onRun() {
    if (!siteUrl) return alert("Pick a Search Console property first.");
    try {
      setLoading(true);
      setErr(null);
      setRows([]);
      const res = await fetch("/api/tracker/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed to run tracker");
      setRows(j.rows ?? []);
    } catch (e: any) {
      setErr(e?.message || "Failed to run tracker");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") return <div className="p-6">Loading…</div>;
  if (!session)
    return (
      <main className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold">Organic Tracker</h1>
          <button className="px-3 py-2 border rounded" onClick={() => signIn("google")}>
            Sign in with Google
          </button>
        </div>
        <p>Sign in to select a GSC property and run the tracker.</p>
      </main>
    );

  return (
    <main className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">Organic Tracker</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{session.user?.email}</span>
          <button className="px-3 py-2 border rounded" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </div>

      <div className="flex gap-2 items-center mb-4">
        <div className="min-w-[320px]">
          <GSCSitePicker value={siteUrl} onChange={setSiteUrl} placeholder="Select a GSC property…" />
        </div>
        <button
          onClick={onRun}
          disabled={loading || !siteUrl}
          className="bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Running…" : "Run"}
        </button>
      </div>

      {err && <div className="mb-3 text-sm text-red-600">{err}</div>}

      <div className="overflow-x-auto border rounded">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2">Query</th>
              <th className="text-right px-3 py-2">Clicks</th>
              <th className="text-right px-3 py-2">Impr.</th>
              <th className="text-right px-3 py-2">CTR</th>
              <th className="text-right px-3 py-2">Avg Pos</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-gray-500" colSpan={5}>
                  Run the tracker to see Top-10 queries.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="border-b">
                  <td className="px-3 py-2">{r.query}</td>
                  <td className="px-3 py-2 text-right">{r.clicks}</td>
                  <td className="px-3 py-2 text-right">{r.impressions}</td>
                  <td className="px-3 py-2 text-right">{(r.ctr * 100).toFixed(2)}%</td>
                  <td className="px-3 py-2 text-right">{Number(r.position).toFixed(1)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="text-xs text-gray-500 mt-6">© {new Date().getFullYear()} VSight — Unified Analytics</footer>
    </main>
  );
}
