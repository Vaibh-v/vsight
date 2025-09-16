// pages/tracker.tsx
import { useSession, signIn } from "next-auth/react";
import { useState } from "react";
import GSCSitePicker from "@/components/GSCSitePicker";
import CountrySelect from "@/components/CountrySelect";
import { BarChartMini } from "@/components/ChartKit";

type Row = { key: string; clicks: number; impressions: number; ctr: number; position: number };

export default function TrackerPage() {
  const { status } = useSession();

  const [site, setSite] = useState<string>("");
  const [dimension, setDimension] = useState<"QUERY" | "PAGE">("QUERY");
  const [limit, setLimit] = useState<number>(25);
  const [device, setDevice] = useState<"" | "DESKTOP" | "MOBILE" | "TABLET">("");
  const [countryCode, setCountryCode] = useState<string>("");
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");
  const [match, setMatch] = useState<"contains" | "equals">("contains");
  const [keyword, setKeyword] = useState<string>("");

  const [sortField, setSortField] = useState<"CLICKS" | "IMPRESSIONS" | "CTR" | "POSITION">("CLICKS");
  const [sortDir, setSortDir] = useState<"ASCENDING" | "DESCENDING">("DESCENDING");

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setError] = useState<string>("");

  const onCountryChange = (v?: string) => setCountryCode(v ?? "");

  async function run() {
    setLoading(true);
    setError("");
    setRows([]);
    try {
      const resp = await fetch("/api/gsc/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteUrl: site,
          startDate: start,
          endDate: end,
          dimension,
          rowLimit: limit,
          keyword,
          match,
          countryCode,
          device,
          sortBy: sortField,
          sortDir,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.detail || data?.error || "Request failed");
      setRows(data.rows || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (status !== "authenticated") {
    return (
      <div className="p-6">
        <div className="mb-3">Please sign in with Google to use the Organic Tracker.</div>
        <button className="px-3 py-2 rounded bg-black text-white" onClick={() => signIn("google")}>
          Sign in
        </button>
      </div>
    );
  }

  const topLabels = rows.slice(0, 10).map((r) => r.key);
  const topClicks = rows.slice(0, 10).map((r) => r.clicks);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Organic Tracker</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm mb-1">GSC Property</label>
          <GSCSitePicker value={site} onChange={setSite} />
        </div>

        <div>
          <label className="block text-sm mb-1">Dimension</label>
          <select className="w-full border rounded px-2 py-2" value={dimension} onChange={(e) => setDimension(e.target.value as any)}>
            <option value="QUERY">Query</option>
            <option value="PAGE">Page</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Row limit</label>
          <input className="w-full border rounded px-2 py-2" type="number" min={1} max={25000}
                 value={limit} onChange={(e) => setLimit(parseInt(e.target.value || "25", 10))} />
        </div>

        <div>
          <label className="block text-sm mb-1">Device (optional)</label>
          <select className="w-full border rounded px-2 py-2" value={device} onChange={(e) => setDevice(e.target.value as any)}>
            <option value="">All</option>
            <option value="DESKTOP">Desktop</option>
            <option value="MOBILE">Mobile</option>
            <option value="TABLET">Tablet</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Country (optional)</label>
          <CountrySelect value={countryCode} onChange={onCountryChange} />
        </div>

        <div>
          <label className="block text-sm mb-1">Start</label>
          <input type="date" className="w-full border rounded px-2 py-2" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm mb-1">End</label>
          <input type="date" className="w-full border rounded px-2 py-2" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm mb-1">Keyword contains / equals</label>
          <div className="flex gap-2">
            <select className="border rounded px-2 py-2" value={match} onChange={(e) => setMatch(e.target.value as any)}>
              <option value="contains">contains</option>
              <option value="equals">equals</option>
            </select>
            <input className="flex-1 border rounded px-2 py-2" placeholder="e.g., nfpa 10"
                   value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Sort</label>
          <div className="flex gap-2">
            <select className="border rounded px-2 py-2" value={sortField} onChange={(e) => setSortField(e.target.value as any)}>
              <option value="CLICKS">Clicks</option>
              <option value="IMPRESSIONS">Impressions</option>
              <option value="CTR">CTR</option>
              <option value="POSITION">Avg Pos</option>
            </select>
            <select className="border rounded px-2 py-2" value={sortDir} onChange={(e) => setSortDir(e.target.value as any)}>
              <option value="DESCENDING">desc</option>
              <option value="ASCENDING">asc</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="px-3 py-2 rounded bg-purple-600 text-white" onClick={run} disabled={loading || !site}>
          {loading ? "Running…" : "Run"}
        </button>
        {errorMsg && <div className="text-red-600 text-sm">{errorMsg}</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-3 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Query / Page</th><th>Clicks</th><th>Impr.</th><th>CTR</th><th>Avg Pos</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td className="py-6 text-gray-500" colSpan={5}>Run the tracker to see results.</td></tr>}
              {rows.map((r, i) => (
                <tr key={`${r.key}-${i}`} className="border-b">
                  <td className="py-2 pr-2">{r.key}</td>
                  <td>{r.clicks}</td>
                  <td>{r.impressions}</td>
                  <td>{(r.ctr * 100).toFixed(2)}%</td>
                  <td>{r.position.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border rounded p-3">
          <div className="font-medium mb-2">Top 10 by Clicks</div>
          <BarChartMini labels={topLabels} data={topClicks} />
          <div className="text-xs text-gray-500 mt-2">Bars show top 10 rows scaled by clicks.</div>
        </div>
      </div>
    </div>
  );
}
