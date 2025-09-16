import * as React from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import GSCSitePicker from "@/components/GSCSitePicker";

type GAProperty = { name: string; propertyId: string; displayName?: string };

export default function InsightPage() {
  const { data: session, status } = useSession();
  const [gaProps, setGaProps] = React.useState<GAProperty[]>([]);
  const [gaProp, setGaProp] = React.useState<string>("");
  const [gscSite, setGscSite] = React.useState<string>("");
  const [start, setStart] = React.useState<string>(() => new Date(Date.now() - 27 * 86400000).toISOString().slice(0, 10));
  const [end, setEnd] = React.useState<string>(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = React.useState(false);
  const [text, setText] = React.useState<string>("Insights are generated from GA4 and/or GSC for the selected range.");
  const [dataBlob, setDataBlob] = React.useState<any | null>(null);
  const [q, setQ] = React.useState("");

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
    setLoading(true); setText("Generating…");
    try {
      const res = await fetch("/api/insight/run", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gaProperty: gaProp || null, gscSite: gscSite || null, start, end }),
      });

      const isJSON = res.headers.get("content-type")?.includes("application/json");
      const payload = isJSON ? await res.json() : { error: await res.text() };

      if (!res.ok) throw new Error(payload?.error || "Failed");
      setText(payload.summary || "No insights.");
      setDataBlob(payload.data || null);
    } catch (e:any) {
      setText(e?.message || "Failed to generate insights.");
    } finally {
      setLoading(false);
    }
  }

  function ask() {
    if (!dataBlob || !q.trim()) return;
    const qq = q.toLowerCase();
    if (qq.includes("top page")) {
      const top = (dataBlob.ga?.topPages ?? []).slice(0, 5).map((p:any)=>`${p.path} (${p.sessions})`).join("; ");
      setText(top ? `Top GA pages: ${top}` : "No GA top pages in range."); return;
    }
    if (qq.includes("top quer")) {
      const top = (dataBlob.gsc?.topQueries ?? []).slice(0, 5).map((p:any)=>`${p.query} (clk ${p.clicks}, pos ${p.position.toFixed(1)})`).join("; ");
      setText(top ? `Top GSC queries: ${top}` : "No GSC top queries in range."); return;
    }
    if (qq.includes("trend")) {
      const s = dataBlob.ga?.series ?? [];
      const change = s.length > 7 ? ((s.at(-1)?.sessions - s.at(-8)?.sessions) / Math.max(1, s.at(-8)?.sessions)) * 100 : 0;
      setText(`Last-week vs prev-week session change ≈ ${isFinite(change) ? change.toFixed(1) : "0"}%`); return;
    }
    setText("Try: 'top pages', 'top queries', or 'session trend'.");
  }

  if (status === "loading") return <div className="p-6">Loading…</div>;
  if (!session)
    return (
      <main className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold">AI Insight</h1>
          <button className="px-3 py-2 border rounded" onClick={() => signIn("google")}>Sign in with Google</button>
        </div>
      </main>
    );

  return (
    <main className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">AI Insight</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{session.user?.email}</span>
          <button className="px-3 py-2 border rounded" onClick={() => signOut()}>Sign out</button>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end mb-3">
        <div>
          <label className="block text-sm mb-1">GA4 Property (optional)</label>
          <select className="w-full border rounded px-3 py-2" value={gaProp} onChange={(e)=>setGaProp(e.target.value)}>
            <option value="">— Not using GA4 —</option>
            {gaProps.map((p)=> <option key={p.propertyId} value={p.propertyId}>{p.displayName || p.name} (ID: {p.propertyId})</option>)}
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
        {loading ? "Generating…" : "Generate insights"}
      </button>

      <div className="mt-4 border rounded p-4 whitespace-pre-wrap text-sm">{text}</div>

      <div className="mt-3 flex gap-2">
        <input className="flex-1 border rounded px-3 py-2" placeholder="Ask: top pages, top queries, session trend…" value={q} onChange={(e)=>setQ(e.target.value)} />
        <button className="px-3 py-2 border rounded" onClick={ask}>Ask</button>
      </div>

      <footer className="text-xs text-gray-500 mt-6">© {new Date().getFullYear()} VSight — Unified Analytics</footer>
    </main>
  );
}
