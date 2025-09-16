// pages/insight.tsx
import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import GSCSitePicker from "@/components/GSCSitePicker";
import { fetchJSON, toYmd, assertDateString, safeNum } from "@/lib/fetcher";

type MoversRow = { query: string; clicks: number; impressions: number; ctr: number; position: number; deltaClicks: number };

export default function Insight() {
  const { data: session } = useSession();
  const [site, setSite] = useState("");
  const [start, setStart] = useState(() => { const d = new Date(); d.setMonth(d.getMonth()-1); return toYmd(d); });
  const [end, setEnd] = useState(() => toYmd(new Date()));
  const [error, setError] = useState("");
  const [highlights, setHighlights] = useState<string[]>([]);
  const [movers, setMovers] = useState<MoversRow[]>([]);

  if (!session) {
    return <div className="max-w-5xl mx-auto p-6">
      <div className="text-xl mb-4">AI Insight</div>
      <button className="px-3 py-2 bg-black text-white rounded" onClick={() => signIn()}>Sign in</button>
    </div>;
  }

  async function generate() {
    try {
      setError(""); setHighlights([]); setMovers([]);
      assertDateString(start, "Start");
      assertDateString(end, "End");
      if (!site) throw new Error("Select a GSC site");

      const resp = await fetchJSON<{
        totals: { clicks: number; impressions: number };
        prevTotals: { clicks: number; impressions: number };
        movers: { query: string; clicks: number; impressions: number; ctr: number; position: number; deltaClicks: number }[];
      }>(`/api/gsc/insights?site=${encodeURIComponent(site)}&start=${start}&end=${end}`);

      const deltas: string[] = [];
      const cDelta = resp.totals.clicks - resp.prevTotals.clicks;
      const iDelta = resp.totals.impressions - resp.prevTotals.impressions;

      if (cDelta > 0) deltas.push(`Clicks up ${safeNum((cDelta / Math.max(resp.prevTotals.clicks, 1)) * 100, 1)}% vs previous half.`);
      else if (cDelta < 0) deltas.push(`Clicks down ${safeNum((Math.abs(cDelta) / Math.max(resp.prevTotals.clicks, 1)) * 100, 1)}% vs previous half.`);

      if (iDelta > 0) deltas.push(`Impressions up ${safeNum((iDelta / Math.max(resp.prevTotals.impressions, 1)) * 100, 1)}% vs previous half.`);
      else if (iDelta < 0) deltas.push(`Impressions down ${safeNum((Math.abs(iDelta) / Math.max(resp.prevTotals.impressions, 1)) * 100, 1)}% vs previous half.`);

      setHighlights(deltas);
      setMovers(resp.movers.slice(0, 10));
    } catch (e:any) {
      setError(e.message || String(e));
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div>
          <label className="block text-sm mb-1">GSC Site</label>
          <GSCSitePicker value={site} onChange={setSite} />
        </div>
        <div />
        <div>
          <label className="block text-sm mb-1">Start</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className="border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">End</label>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="border rounded px-3 py-2" />
        </div>
      </div>

      <div className="mt-4 flex gap-3 items-center">
        <button onClick={generate} className="px-3 py-2 rounded bg-violet-600 text-white">Generate insights</button>
        {error && <div className="text-red-600 text-sm">{error}</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="border rounded">
          <div className="px-3 py-2 font-medium border-b">Highlights</div>
          <ul className="px-5 py-3 list-disc">
            {highlights.length ? highlights.map((h,i) => <li key={i}>{h}</li>) : <li className="text-gray-400">—</li>}
          </ul>
        </div>
        <div className="border rounded">
          <div className="px-3 py-2 font-medium border-b">Top movers (by click delta)</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-3 py-2">Query</th>
                <th className="px-3 py-2 text-right">Clicks</th>
                <th className="px-3 py-2 text-right">Impr.</th>
                <th className="px-3 py-2 text-right">CTR</th>
                <th className="px-3 py-2 text-right">Pos</th>
                <th className="px-3 py-2 text-right">Δ Clicks</th>
              </tr>
            </thead>
            <tbody>
              {movers.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-3 py-2 truncate">{r.query}</td>
                  <td className="px-3 py-2 text-right">{safeNum(r.clicks, 0)}</td>
                  <td className="px-3 py-2 text-right">{safeNum(r.impressions, 0)}</td>
                  <td className="px-3 py-2 text-right">{safeNum(r.ctr * 100, 1)}%</td>
                  <td className="px-3 py-2 text-right">{safeNum(r.position, 1)}</td>
                  <td className="px-3 py-2 text-right">{safeNum(r.deltaClicks, 0)}</td>
                </tr>
              ))}
              {!movers.length && <tr><td className="px-3 py-3 text-gray-400">No data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
