// pages/insight.tsx
import { useState } from "react";
import GSCSitePicker from "@/components/GSCSitePicker";
import { safeFetchJSON, toISO } from "@/lib/safeFetch";

type Row = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

export default function Insight() {
  const [siteUrl, setSiteUrl] = useState<string | undefined>();
  const [start, setStart] = useState(toISO(new Date(Date.now() - 45 * 864e5))!);
  const [end, setEnd] = useState(toISO(new Date())!);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [top, setTop] = useState<Row[]>([]);
  const [err, setErr] = useState("");

  const run = async () => {
    setErr(""); setHighlights([]); setTop([]);
    try {
      if (!siteUrl) throw new Error("Select a GSC site.");
      const mid = new Date((+new Date(start)) + ((+new Date(end) - +new Date(start)) / 2));
      const prevStart = toISO(new Date(+new Date(start) - (+new Date(end) - +new Date(mid))))!;
      const prevEnd = toISO(mid)!;

      // Current period totals
      const curr = await safeFetchJSON<{ rows: Row[] }>("/api/gsc/query", {
        method: "POST",
        body: JSON.stringify({ siteUrl, startDate: start, endDate: end, dimension: "query", rowLimit: 1000, sortBy: "clicks", sortDir: "desc" }),
      });

      const prev = await safeFetchJSON<{ rows: Row[] }>("/api/gsc/query", {
        method: "POST",
        body: JSON.stringify({ siteUrl, startDate: prevStart, endDate: prevEnd, dimension: "query", rowLimit: 1000, sortBy: "clicks", sortDir: "desc" }),
      });

      const sum = (xs: Row[], k: keyof Row) => xs.reduce((s, r) => s + (Number(r[k]) || 0), 0);
      const cClicks = sum(curr.rows, "clicks");
      const pClicks = sum(prev.rows, "clicks");
      const cImpr = sum(curr.rows, "impressions");
      const pImpr = sum(prev.rows, "impressions");
      const pct = (a: number, b: number) => (b === 0 ? 0 : ((a - b) / b) * 100);

      const hi = [
        `Clicks ${pct(cClicks, pClicks) >= 0 ? "up" : "down"} ${Math.abs(pct(cClicks, pClicks)).toFixed(1)}% vs previous half.`,
        `Impressions ${pct(cImpr, pImpr) >= 0 ? "up" : "down"} ${Math.abs(pct(cImpr, pImpr)).toFixed(1)}% vs previous half.`,
      ];

      // Movers: rank queries by click delta
      const prevMap = new Map(prev.rows.map(r => [r.keys?.[0], r]));
      const movers = curr.rows
        .map(r => ({ ...r, delta: r.clicks - (prevMap.get(r.keys?.[0])?.clicks || 0) }))
        .sort((a, b) => b.delta - a.delta)
        .slice(0, 10);

      setHighlights(hi);
      setTop(movers);
    } catch (e: any) {
      setErr(e.message || String(e));
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="col-span-2">
          <label className="block text-sm mb-1">GSC Site</label>
          <GSCSitePicker value={siteUrl} onChange={setSiteUrl} />
        </div>
        <div>
          <label className="block text-sm mb-1">Start</label>
          <input type="date" className="border rounded px-2 py-1 w-full"
            value={start} onChange={e => setStart(toISO(e.target.value) || start)} />
        </div>
        <div>
          <label className="block text-sm mb-1">End</label>
          <input type="date" className="border rounded px-2 py-1 w-full"
            value={end} onChange={e => setEnd(toISO(e.target.value) || end)} />
        </div>
        <div className="md:col-start-4 flex items-end">
          <button className="px-3 py-2 rounded bg-purple-600 text-white" onClick={run}>Generate insights</button>
        </div>
      </div>

      {err && <div className="text-red-600 text-sm">{err}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-3">
          <div className="font-medium mb-2">Highlights</div>
          <ul className="list-disc pl-5 text-sm">
            {highlights.length === 0 && <li>No insights yet. Click Generate.</li>}
            {highlights.map((h, i) => <li key={i}>{h}</li>)}
          </ul>
        </div>

        <div className="border rounded p-3 overflow-auto">
          <div className="font-medium mb-2">Top movers (by click delta)</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Query</th>
                <th className="py-2">Clicks</th>
                <th className="py-2">Impr.</th>
                <th className="py-2">CTR</th>
                <th className="py-2">Pos</th>
                <th className="py-2">Δ Clicks</th>
              </tr>
            </thead>
            <tbody>
              {top.length === 0 && <tr><td colSpan={6} className="py-4 text-gray-500">No data.</td></tr>}
              {top.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 break-all">{r.keys?.[0] ?? "-"}</td>
                  <td className="py-2">{r.clicks ?? 0}</td>
                  <td className="py-2">{r.impressions ?? 0}</td>
                  <td className="py-2">{((r.ctr ?? 0) * 100).toFixed(2)}%</td>
                  <td className="py-2">{(r.position ?? 0).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
