import * as React from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import GSCSitePicker from "@/components/GSCSitePicker";
import { HBarChart } from "@/components/CanvasChart";

type Row = { key: string; clicks: number; impressions: number; ctr: number; position: number };

function toCSV(rows: Row[]) {
  const hdr = ["Key", "Clicks", "Impressions", "CTR", "Position"].join(",");
  const lines = rows.map(r => [r.key, r.clicks, r.impressions, (r.ctr*100).toFixed(2)+"%", r.position.toFixed(1)].join(","));
  return [hdr, ...lines].join("\n");
}

export default function TrackerPage() {
  const { data: session, status } = useSession();

  const [siteUrl, setSiteUrl] = React.useState("");
  const [startDate, setStartDate] = React.useState(() => new Date(Date.now() - 27*86400000).toISOString().slice(0,10));
  const [endDate, setEndDate] = React.useState(() => new Date().toISOString().slice(0,10));
  const [dimension, setDimension] = React.useState<"query"|"page">("query");
  const [country, setCountry] = React.useState(""); // Accepts "US", "USA", "United States", "COUNTRY_US"
  const [device, setDevice] = React.useState("");
  const [rowLimit, setRowLimit] = React.useState(25);
  const [query, setQuery] = React.useState("");
  const [queryMatch, setQueryMatch] = React.useState<"contains"|"equals">("contains");
  const [sortBy, setSortBy] = React.useState<"clicks"|"impressions"|"ctr"|"position">("clicks");
  const [sortDir, setSortDir] = React.useState<"asc"|"desc">("desc");

  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function onRun() {
    if (!siteUrl) return alert("Pick a Search Console property first.");
    try {
      setLoading(true); setErr(null); setRows([]);
      const res = await fetch("/api/tracker/run", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          siteUrl, startDate, endDate, rowLimit,
          country, device, query, queryMatch, dimension, sortBy, sortDir
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed to run tracker");
      setRows(j.rows ?? []);
    } catch (e:any) {
      setErr(e?.message || "Failed to run tracker");
    } finally { setLoading(false); }
  }

  function downloadCSV() {
    const blob = new Blob([toCSV(rows)], {type: "text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `tracker_${dimension}_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (status === "loading") return <div className="p-6">Loading…</div>;
  if (!session) {
    return (
      <main className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold">Organic Tracker</h1>
          <button className="px-3 py-2 border rounded" onClick={() => signIn("google")}>Sign in with Google</button>
        </div>
        <p>Sign in to select a GSC property and run the tracker.</p>
      </main>
    );
  }

  const barData = rows.map(r => ({ label: r.key, value: r[sortBy] as number }));

  return (
    <main className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">Organic Tracker</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{session.user?.email}</span>
          <button className="px-3 py-2 border rounded" onClick={() => signOut()}>Sign out</button>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-3">
        <div className="lg:col-span-2">
          <label className="block text-sm mb-1">GSC Property</label>
          <GSCSitePicker value={siteUrl} onChange={setSiteUrl} placeholder="Select a GSC property…" />
        </div>
        <div>
          <label className="block text-sm mb-1">Dimension</label>
          <select className="w-full border rounded px-3 py-2" value={dimension} onChange={(e)=>setDimension(e.target.value as any)}>
            <option value="query">Query</option>
            <option value="page">Page</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Row limit</label>
          <input className="w-full border rounded px-3 py-2" type="number" min={1} max={1000} value={rowLimit} onChange={(e)=>setRowLimit(Number(e.target.value))}/>
        </div>

        <div>
          <label className="block text-sm mb-1">Start</label>
          <input className="w-full border rounded px-3 py-2" type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)}/>
        </div>
        <div>
          <label className="block text-sm mb-1">End</label>
          <input className="w-full border rounded px-3 py-2" type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)}/>
        </div>
        <div>
          <label className="block text-sm mb-1">Country (optional)</label>
          <input className="w-full border rounded px-3 py-2" placeholder="US / USA / United States / COUNTRY_US" value={country} onChange={(e)=>setCountry(e.target.value)}/>
        </div>
        <div>
          <label className="block text-sm mb-1">Device (optional)</label>
          <select className="w-full border rounded px-3 py-2" value={device} onChange={(e)=>setDevice(e.target.value)}>
            <option value="">All</option>
            <option value="DESKTOP">Desktop</option>
            <option value="MOBILE">Mobile</option>
            <option value="TABLET">Tablet</option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <label className="block text-sm mb-1">Keyword contains / equals</label>
          <div className="flex gap-2">
            <select className="border rounded px-3 py-2" value={queryMatch} onChange={(e)=>setQueryMatch(e.target.value as any)}>
              <option value="contains">contains</option>
              <option value="equals">equals</option>
            </select>
            <input className="flex-1 border rounded px-3 py-2" placeholder="nfpa 13 2025…" value={query} onChange={(e)=>setQuery(e.target.value)}/>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Sort</label>
          <div className="flex gap-2">
            <select className="border rounded px-3 py-2" value={sortBy} onChange={(e)=>setSortBy(e.target.value as any)}>
              <option value="clicks">Clicks</option>
              <option value="impressions">Impressions</option>
              <option value="ctr">CTR</option>
              <option value="position">Position</option>
            </select>
            <select className="border rounded px-3 py-2" value={sortDir} onChange={(e)=>setSortDir(e.target.value as any)}>
              <option value="desc">desc</option>
              <option value="asc">asc</option>
            </select>
          </div>
        </div>

        <div className="flex items-end gap-2">
          <button onClick={onRun} disabled={loading || !siteUrl} className="bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50">
            {loading ? "Running…" : "Run"}
          </button>
          <button onClick={downloadCSV} disabled={!rows.length} className="px-4 py-2 border rounded disabled:opacity-50">
            Download CSV
          </button>
        </div>
      </div>

      {/* Results & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 overflow-x-auto border rounded">
          <table className="min-w-[820px] w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-3 py-2">{dimension === "query" ? "Query" : "Page"}</th>
                <th className="text-right px-3 py-2">Clicks</th>
                <th className="text-right px-3 py-2">Impr.</th>
                <th className="text-right px-3 py-2">CTR</th>
                <th className="text-right px-3 py-2">Avg Pos</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td className="px-3 py-8 text-gray-500" colSpan={5}>Run the tracker to see results.</td></tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-3 py-2">{r.key}</td>
                    <td className="px-3 py-2 text-right">{r.clicks}</td>
                    <td className="px-3 py-2 text-right">{r.impressions}</td>
                    <td className="px-3 py-2 text-right">{(r.ctr*100).toFixed(2)}%</td>
                    <td className="px-3 py-2 text-right">{Number(r.position).toFixed(1)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border rounded p-2">
          <div className="font-medium mb-2">Top 10 by {sortBy[0].toUpperCase() + sortBy.slice(1)}</div>
          <HBarChart bars={barData} />
          <div className="text-xs text-gray-500 mt-2">Bars show top 10 rows scaled by {sortBy}.</div>
        </div>
      </div>

      {err && <div className="mt-3 text-sm text-red-600">{err}</div>}

      <footer className="text-xs text-gray-500 mt-6">© {new Date().getFullYear()} VSight — Unified Analytics</footer>
    </main>
  );
}
