import * as React from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import GSCSitePicker from "@/components/GSCSitePicker";

type GAProperty = { name: string; propertyId: string; displayName?: string };

function LineChart({ points, height=80 }: { points: number[]; height?: number }) {
  if (!points.length) return <div className="text-sm text-gray-500">No data</div>;
  const w = 420, h = height, pad = 6;
  const max = Math.max(...points, 1);
  const step = (w - pad * 2) / Math.max(1, points.length - 1);
  const d = points.map((v,i)=>{
    const x = pad + i*step;
    const y = h - pad - (v/max)*(h - pad*2);
    return `${i ? "L":"M"}${x},${y}`;
  }).join(" ");
  return <svg width={w} height={h}><path d={d} stroke="currentColor" strokeWidth="2" fill="none"/></svg>;
}

function TinyBars({ data }: { data: { label: string; value: number }[] }) {
  if (!data.length) return <div className="text-sm text-gray-500">No data</div>;
  const max = Math.max(...data.map(d=>d.value), 1);
  return (
    <ul className="text-sm space-y-1">
      {data.map((d,i)=>(
        <li key={i} className="flex items-center gap-2">
          <span className="truncate max-w-[60%]" title={d.label}>{d.label}</span>
          <div className="flex-1 h-2 bg-gray-200 rounded">
            <div className="h-2 rounded" style={{ width: `${(d.value/max)*100}%` }} />
          </div>
          <span className="min-w-[48px] text-right">{d.value}</span>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [gaProps, setGaProps] = React.useState<GAProperty[]>([]);
  const [gaProp, setGaProp] = React.useState<string>("");
  const [gscSite, setGscSite] = React.useState<string>("");
  const [start, setStart] = React.useState<string>(() => new Date(Date.now() - 27 * 86400000).toISOString().slice(0, 10));
  const [end, setEnd] = React.useState<string>(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [gaSeries, setGaSeries] = React.useState<any[]>([]);
  const [gaTopPages, setGaTopPages] = React.useState<any[]>([]);
  const [gaSM, setGaSM] = React.useState<any[]>([]);
  const [gscSeries, setGscSeries] = React.useState<any[]>([]);
  const [gscTopQueries, setGscTopQueries] = React.useState<any[]>([]);

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
      setLoading(true); setErr(null);
      const res = await fetch("/api/dashboard/run", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gaProperty: gaProp || null, gscSite: gscSite || null, start, end }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Run failed");
      setGaSeries(j.ga?.series ?? []);
      setGaTopPages(j.ga?.topPages ?? []);
      setGaSM(j.ga?.topSourceMedium ?? []);
      setGscSeries(j.gsc?.series ?? []);
      setGscTopQueries(j.gsc?.topQueries ?? []);
    } catch (e:any) {
      setErr(e?.message || "Run failed");
    } finally { setLoading(false); }
  }

  if (status === "loading") return <div className="p-6">Loading…</div>;
  if (!session) return (
    <main className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">Default Dashboard</h1>
        <button className="px-3 py-2 border rounded" onClick={() => signIn("google")}>Sign in with Google</button>
      </div>
    </main>
  );

  const gaSessions = gaSeries.map((d)=>d.sessions??0);
  const gaUsers = gaSeries.map((d)=>d.users??0);
  const gscClicks = gscSeries.map((d)=>d.clicks??0);
  const gscImpr = gscSeries.map((d)=>d.impressions??0);

  return (
    <main className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">Default Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{session.user?.email}</span>
          <button className="px-3 py-2 border rounded" onClick={() => signOut()}>Sign out</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end mb-3">
        <div>
          <label className="block text-sm mb-1">GA4 Property (optional)</label>
          <select className="w-full border rounded px-3 py-2" value={gaProp} onChange={(e)=>setGaProp(e.target.value)}>
            <option value="">— Not using GA4 —</option>
            {gaProps.map((p)=>(
              <option key={p.propertyId} value={p.propertyId}>{p.displayName || p.name} (ID: {p.propertyId})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">GSC Site (optional)</label>
          <GSCSitePicker value={gscSite} onChange={setGscSite} placeholder="— Not using GSC —" />
        </div>
        <div>
          <label className="block text-sm mb-1">Start</label>
          <input type="date" className="border rounded px-3 py-2" value={start} onChange={(e)=>setStart(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">End</label>
          <input type="date" className="border rounded px-3 py-2" value={end} onChange={(e)=>setEnd(e.target.value)} />
        </div>
      </div>

      <button onClick={run} disabled={loading} className="bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50">
        {loading ? "Running…" : "Run"}
      </button>
      {err && <div className="mt-3 text-sm text-red-600">{err}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <div className="border rounded p-3"><div className="font-medium">GA4 Sessions (by day)</div><LineChart points={gaSessions} /></div>
        <div className="border rounded p-3"><div className="font-medium">GA4 Active Users (by day)</div><LineChart points={gaUsers} /></div>
        <div className="border rounded p-3"><div className="font-medium">GSC Clicks (by day)</div><LineChart points={gscClicks} /></div>
        <div className="border rounded p-3"><div className="font-medium">GSC Impressions (by day)</div><LineChart points={gscImpr} /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <div className="border rounded p-3">
          <div className="font-medium mb-2">GA4 Top Pages</div>
          {gaTopPages.length ? (
            <ul className="text-sm">
              {gaTopPages.map((d:any,i:number)=>(
                <li key={i} className="flex justify-between border-b py-1">
                  <span className="truncate max-w-[70%]" title={d.path}>{d.path}</span>
                  <span>{d.sessions}</span>
                </li>
              ))}
            </ul>
          ) : <div className="text-sm text-gray-500">No GA data</div>}
        </div>
        <div className="border rounded p-3">
          <div className="font-medium mb-2">GA4 Source / Medium</div>
          <TinyBars data={gaSM.map((s:any)=>({label:s.label, value:s.sessions}))} />
        </div>
      </div>

      <div className="border rounded p-3 mt-5">
        <div className="font-medium mb-2">GSC Top Queries</div>
        {gscTopQueries.length ? (
          <table className="w-full text-sm">
            <thead className="border-b"><tr>
              <th className="text-left py-1">Query</th><th className="text-right py-1">Clicks</th>
              <th className="text-right py-1">Impr.</th><th className="text-right py-1">CTR</th><th className="text-right py-1">Pos</th>
            </tr></thead>
            <tbody>
            {gscTopQueries.map((q:any,i:number)=>(
              <tr key={i} className="border-b">
                <td className="py-1 pr-2">{q.query}</td>
                <td className="py-1 text-right">{q.clicks}</td>
                <td className="py-1 text-right">{q.impressions}</td>
                <td className="py-1 text-right">{(q.ctr*100).toFixed(1)}%</td>
                <td className="py-1 text-right">{q.position.toFixed(1)}</td>
              </tr>
            ))}
            </tbody>
          </table>
        ) : <div className="text-sm text-gray-500">No GSC data</div>}
      </div>

      <footer className="text-xs text-gray-500 mt-6">© {new Date().getFullYear()} VSight — Unified Analytics</footer>
    </main>
  );
}
