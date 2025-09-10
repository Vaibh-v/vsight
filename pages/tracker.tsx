import { useSession } from "next-auth/react";
import useSWR from "swr";
import { useEffect, useState } from "react";
import { useAppState } from "@/components/state/AppStateProvider";

function lastNDays(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

export default function Tracker() {
  const { status } = useSession();
  const { gscSiteUrl, dateRange, setSelections } = useAppState();

  useEffect(() => {
    if (!dateRange) {
      const r = lastNDays(28);
      setSelections({ dateRange: { start: r.start, end: r.end } });
    }
  }, [dateRange, setSelections]);

  const start = dateRange?.start;
  const end = dateRange?.end;

  const { data: gscSites } = useSWR(status === "authenticated" ? "/api/gsc/sites" : null);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const canRun = !!(gscSiteUrl && start && end);

  const run = async () => {
    if (!canRun) return;
    setLoading(true);
    setRows([]);
    try {
      const res = await fetch(`/api/gsc/top10?siteUrl=${encodeURIComponent(gscSiteUrl!)}&start=${start}&end=${end}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      setRows(j.rows || []);
    } catch (e: any) {
      alert(e.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  if (status !== "authenticated") {
    return <main className="max-w-5xl mx-auto p-6">Please sign in on the <a className="underline" href="/connections">Connections</a> page.</main>;
  }

  const gscOptions = (gscSites?.sites || []) as Array<{ siteUrl: string }>;

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Organic Tracker</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="text-sm text-gray-600">GSC Site</label>
          <select
            className="mt-1 w-full border rounded px-3 py-2"
            value={gscSiteUrl || ""}
            onChange={(e) => setSelections({ gscSiteUrl: e.target.value })}
          >
            <option value="">Select GSC site…</option>
            {gscOptions.map((s) => (
              <option key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</option>
            ))}
          </select>

          {start && end && <p className="text-xs text-gray-500 mt-2">Date range: {start} → {end}</p>}
        </div>

        <div className="flex gap-2">
          <button onClick={() => setSelections({ dateRange: lastNDays(28) })} className="px-3 py-2 border rounded">Last 28 days</button>
          <button onClick={() => setSelections({ dateRange: lastNDays(90) })} className="px-3 py-2 border rounded">Last 90 days</button>
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={run} disabled={!canRun || loading} className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50">
            {loading ? "Running…" : "Run"}
          </button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Query</th>
              <th className="p-2 text-right">Clicks</th>
              <th className="p-2 text-right">Impr.</th>
              <th className="p-2 text-right">CTR</th>
              <th className="p-2 text-right">Avg Pos</th>
            </tr>
          </thead>
          <tbody>
            {!rows.length ? (
              <tr>
                <td className="p-3 text-gray-500" colSpan={5}>Run the tracker to see Top-10 queries.</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className={i % 2 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="p-2">{r.query}</td>
                  <td className="p-2 text-right">{r.clicks}</td>
                  <td className="p-2 text-right">{r.impressions}</td>
                  <td className="p-2 text-right">{(Number(r.ctr) * 100).toFixed(2)}%</td>
                  <td className="p-2 text-right">{Number(r.position).toFixed(1)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
