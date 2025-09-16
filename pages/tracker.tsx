// pages/tracker.tsx
import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import GSCSitePicker from "@/components/GSCSitePicker";
import { fetchJSON, toYmd, assertDateString, safeNum } from "@/lib/fetcher";
import MiniLine from "@/components/MiniLine";

type Row = { key: string; clicks: number; impressions: number; ctr: number; position: number };

const COUNTRIES = [
  "All countries","United States","India","United Kingdom","Canada","Australia","Germany","France","Singapore"
];

export default function Tracker() {
  const { data: session } = useSession();
  const [site, setSite] = useState("");
  const [dimension, setDimension] = useState<"query" | "page">("page");
  const [rowLimit, setRowLimit] = useState(25);
  const [device, setDevice] = useState<"all" | "desktop" | "mobile" | "tablet">("all");
  const [country, setCountry] = useState("All countries");
  const [keywordMode, setKeywordMode] = useState<"contains" | "equals">("contains");
  const [keyword, setKeyword] = useState("");
  const [start, setStart] = useState(() => { const d = new Date(); d.setMonth(d.getMonth()-1); return toYmd(d); });
  const [end, setEnd] = useState(() => toYmd(new Date()));
  const [error, setError] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [top10, setTop10] = useState<number[]>([]);

  if (!session) {
    return <div className="max-w-5xl mx-auto p-6">
      <div className="text-xl mb-4">Organic Tracker</div>
      <button className="px-3 py-2 bg-black text-white rounded" onClick={() => signIn()}>Sign in</button>
    </div>;
  }

  async function run() {
    try {
      setError("");
      assertDateString(start, "Start");
      assertDateString(end, "End");
      if (!site) throw new Error("Select a GSC property");

      const qs = new URLSearchParams({
        site, dimension,
        start, end,
        limit: String(rowLimit),
        device,
        country: country === "All countries" ? "" : country,
        keywordMode, keyword
      });

      const data = await fetchJSON<{ rows: Row[] }>(`/api/gsc/organic-tracker?${qs.toString()}`);
      const r = data.rows || [];
      setRows(r);

      const top = r.slice(0, 10).map(x => safeNum(x.clicks, 0));
      setTop10(top);
    } catch (e:any) {
      setRows([]); setTop10([]);
      setError(e.message || String(e));
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div>
          <label className="block text-sm mb-1">GSC Property</label>
          <GSCSitePicker value={site} onChange={setSite} />
        </div>
        <div>
          <label className="block text-sm mb-1">Dimension</label>
          <select value={dimension} onChange={e => setDimension(e.target.value as any)} className="border rounded px-3 py-2">
            <option value="page">Page</option>
            <option value="query">Query</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Country (optional)</label>
          <select value={country} onChange={e => setCountry(e.target.value)} className="border rounded px-3 py-2">
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Device (optional)</label>
          <select value={device} onChange={e => setDevice(e.target.value as any)} className="border rounded px-3 py-2">
            <option value="all">All</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
            <option value="tablet">Tablet</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Start</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className="border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">End</label>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="border rounded px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm mb-1">Keyword mode</label>
          <select value={keywordMode} onChange={e => setKeywordMode(e.target.value as any)} className="border rounded px-3 py-2">
            <option value="contains">contains</option>
            <option value="equals">equals</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Keyword</label>
          <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="e.g., nfpa 10" className="border rounded px-3 py-2 w-full" />
        </div>
      </div>

      <div className="mt-4 flex gap-3 items-center">
        <button onClick={run} className="px-3 py-2 rounded bg-violet-600 text-white">Run</button>
        {error && <div className="text-red-600 text-sm">{error}</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="border rounded">
          <div className="px-3 py-2 font-medium border-b">Results</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-3 py-2">{dimension === "page" ? "Page" : "Query"}</th>
                <th className="px-3 py-2 text-right">Clicks</th>
                <th className="px-3 py-2 text-right">Impr.</th>
                <th className="px-3 py-2 text-right">CTR</th>
                <th className="px-3 py-2 text-right">Avg Pos</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-3 py-2 truncate">{r.key}</td>
                  <td className="px-3 py-2 text-right">{safeNum(r.clicks, 0)}</td>
                  <td className="px-3 py-2 text-right">{safeNum(r.impressions, 0)}</td>
                  <td className="px-3 py-2 text-right">{safeNum(r.ctr * 100, 1)}%</td>
                  <td className="px-3 py-2 text-right">{safeNum(r.position, 1)}</td>
                </tr>
              ))}
              {!rows.length && <tr><td className="px-3 py-3 text-gray-400">Run the tracker to see results.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="border rounded">
          <div className="px-3 py-2 font-medium border-b">Top 10 by Clicks</div>
          <MiniLine data={top10} />
          <div className="px-3 py-2 text-xs text-gray-500">Bars show top 10 rows scaled by clicks.</div>
        </div>
      </div>
    </div>
  );
}
