// pages/insight.tsx
import { useSession, signIn } from "next-auth/react";
import { useState } from "react";
import GSCSitePicker from "@/components/GSCSitePicker";

type InsightResp = { bullets: string[]; topQueries: Array<{ q: string; clicks: number; ctr: number }> };

export default function InsightPage() {
  const { status } = useSession();
  const [site, setSite] = useState<string>("");
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");
  const [resp, setResp] = useState<InsightResp | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true); setError(""); setResp(null);
    try {
      const r = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl: site, startDate: start, endDate: end }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || j?.error || "Failed to generate insights");
      setResp(j);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  if (status !== "authenticated") {
    return (
      <div className="p-6">
        <div className="mb-3">Please sign in to see Insights.</div>
        <button className="px-3 py-2 rounded bg-black text-white" onClick={() => signIn("google")}>Sign in</button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">AI Insight</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div><label className="block text-sm mb-1">GSC Site</label><GSCSitePicker value={site} onChange={setSite} /></div>
        <div><label className="block text-sm mb-1">Start</label><input type="date" className="w-full border rounded px-2 py-2" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div><label className="block text-sm mb-1">End</label><input type="date" className="w-full border rounded px-2 py-2" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
      </div>
      <button className="px-3 py-2 rounded bg-purple-600 text-white" onClick={run} disabled={loading || !site}>
        {loading ? "Generating…" : "Generate insights"}
      </button>
      {error && <div className="text-red-600">{error}</div>}

      {resp && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded p-3">
            <div className="font-medium mb-2">Highlights</div>
            <ul className="list-disc ml-6">{resp.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
          </div>
          <div className="border rounded p-3">
            <div className="font-medium mb-2">Top queries (by clicks)</div>
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b"><th className="py-2">Query</th><th>Clicks</th><th>CTR</th></tr></thead>
              <tbody>{resp.topQueries.map((q, i) => (<tr key={i} className="border-b"><td className="py-2 pr-2">{q.q}</td><td>{q.clicks}</td><td>{(q.ctr * 100).toFixed(2)}%</td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
