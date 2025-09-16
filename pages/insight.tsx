import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import GSCSitePicker from "@/components/GSCSitePicker";

type InsightRow = { query: string; clicks: number; impressions: number; ctr: number; position: number; deltaClicks?: number };

export default function Insight() {
  const { data: session, status } = useSession();
  const [siteUrl, setSiteUrl] = useState<string>("");
  const [start, setStart] = useState<string>("2025-08-17");
  const [end, setEnd] = useState<string>("2025-09-16");
  const [highlights, setHighlights] = useState<string[]>([]);
  const [movers, setMovers] = useState<InsightRow[]>([]);

  if (status === "loading") return null;
  if (!session) return <div className="p-6"><button className="px-3 py-2 rounded bg-black text-white" onClick={() => signIn()}>Sign in</button></div>;

  async function generate() {
    try {
      const res = await fetch("/api/gsc/insights", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl, start, end, rowLimit: 20 })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed");
      setHighlights(json.highlights ?? []);
      setMovers(json.movers ?? []);
    } catch (e: any) {
      console.error(e);
      alert(e.message ?? "Failed to generate insights");
      setHighlights([]);
      setMovers([]);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm mb-1">GSC Site</label>
          <GSCSitePicker value={siteUrl} onChange={setSiteUrl} />
        </div>
        <div>
          <label className="block text-sm mb-1">Start</label>
          <input value={start} onChange={e => setStart(e.target.value)} type="date" className="border rounded px-2 py-1 w-full" />
        </div>
        <div>
          <label className="block text-sm mb-1">End</label>
          <input value={end} onChange={e => setEnd(e.target.value)} type="date" className="border rounded px-2 py-1 w-full" />
        </div>
      </div>

      <button onClick={generate} className="px-3 py-2 rounded bg-violet-600 text-white">Generate insights</button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-3">
          <div className="font-medium mb-2">Highlights</div>
          <ul className="list-disc pl-6">
            {highlights.map((h, i) => <li key={i}>{h}</li>)}
            {highlights.length === 0 && <li className="text-gray-500">—</li>}
          </ul>
        </div>
        <div className="border rounded p-3 overflow-auto">
          <div className="font-medium mb-2">Top movers (by click delta)</div>
          <table className="min-w-[700px] w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Query</th>
                <th className="py-2 pr-4">Clicks</th>
                <th className="py-2 pr-4">Impr.</th>
                <th className="py-2 pr-4">CTR</th>
                <th className="py-2 pr-4">Pos</th>
                <th className="py-2 pr-4">Δ Clicks</th>
              </tr>
            </thead>
            <tbody>
              {movers.map((r, i) => (
                <tr key={i} className="border-b last:border-b-0">
                  <td className="py-2 pr-4">{r.query}</td>
                  <td className="py-2 pr-4">{r.clicks}</td>
                  <td className="py-2 pr-4">{r.impressions}</td>
                  <td className="py-2 pr-4">{(r.ctr * 100).toFixed(1)}%</td>
                  <td className="py-2 pr-4">{r.position.toFixed(1)}</td>
                  <td className="py-2 pr-4">{r.deltaClicks ?? "—"}</td>
                </tr>
              ))}
              {movers.length === 0 && <tr><td className="py-6 text-gray-500" colSpan={6}>No data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
