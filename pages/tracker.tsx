import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import GSCSitePicker from "@/components/GSCSitePicker";
import CountrySelect from "@/components/CountrySelect";
import { BarChartModern } from "@/components/ChartKit";

type Row = { key: string; clicks: number; impressions: number; ctr: number; position: number };

const deviceOptions = ["All", "Desktop", "Mobile", "Tablet"] as const;
type Device = typeof deviceOptions[number];

export default function Tracker() {
  const { data: session, status } = useSession();

  const [siteUrl, setSiteUrl] = useState<string>("");
  const [dimension, setDimension] = useState<"query" | "page">("page");
  const [rowLimit, setRowLimit] = useState<number>(25);
  const [country, setCountry] = useState<string>(""); // ISO name (we map to COUNTRY_XX)
  const [device, setDevice] = useState<Device>("All");
  const [start, setStart] = useState<string>("2025-08-17");
  const [end, setEnd] = useState<string>("2025-09-16");
  const [keywordMode, setKeywordMode] = useState<"contains" | "equals">("contains");
  const [keyword, setKeyword] = useState<string>("");
  const [sort, setSort] = useState<"clicks" | "impressions" | "ctr" | "position">("clicks");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const [rows, setRows] = useState<Row[]>([]);

  if (status === "loading") return null;
  if (!session) return <div className="p-6"><button className="px-3 py-2 rounded bg-black text-white" onClick={() => signIn()}>Sign in</button></div>;

  const codeFromCountry = (name: string | ""): string | undefined => {
    if (!name) return undefined;
    // Minimal mapping; backend also accepts COUNTRY_US etc when uppercased 2-letter code exists.
    const map: Record<string, string> = {
      "United States": "COUNTRY_US",
      India: "COUNTRY_IN",
      "United Kingdom": "COUNTRY_GB",
      Canada: "COUNTRY_CA",
      Australia: "COUNTRY_AU",
    };
    return map[name] ?? undefined;
  };

  async function run() {
    try {
      const body = {
        siteUrl,
        start,
        end,
        dimension,
        rowLimit,
        country: codeFromCountry(country),
        device: device === "All" ? undefined : device,
        keywordMode,
        keyword: keyword.trim() || undefined,
        sort,
        dir,
      };

      const res = await fetch("/api/gsc/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed");
      setRows(json.rows ?? []);
    } catch (e: any) {
      console.error(e);
      alert(e.message ?? "Tracker failed");
      setRows([]);
    }
  }

  const bars = rows.slice(0, 10).map(r => ({ label: r.key, value: r.clicks }));

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">GSC Property</label>
          <GSCSitePicker value={siteUrl} onChange={setSiteUrl} />
        </div>
        <div>
          <label className="block text-sm mb-1">Dimension</label>
          <select value={dimension} onChange={e => setDimension(e.target.value as any)} className="border rounded px-2 py-1 w-full">
            <option value="query">Query</option>
            <option value="page">Page</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Row limit</label>
          <input type="number" min={1} max={25000} value={rowLimit} onChange={e => setRowLimit(parseInt(e.target.value || "25"))} className="border rounded px-2 py-1 w-full" />
        </div>
        <div>
          <label className="block text-sm mb-1">Device (optional)</label>
          <select value={device} onChange={e => setDevice(e.target.value as Device)} className="border rounded px-2 py-1 w-full">
            {deviceOptions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Country (optional)</label>
          <CountrySelect value={country} onChange={setCountry} />
        </div>
        <div>
          <label className="block text-sm mb-1">Start</label>
          <input value={start} onChange={e => setStart(e.target.value)} type="date" className="border rounded px-2 py-1 w-full" />
        </div>
        <div>
          <label className="block text-sm mb-1">End</label>
          <input value={end} onChange={e => setEnd(e.target.value)} type="date" className="border rounded px-2 py-1 w-full" />
        </div>

        <div>
          <label className="block text-sm mb-1">Keyword mode</label>
          <select value={keywordMode} onChange={e => setKeywordMode(e.target.value as any)} className="border rounded px-2 py-1 w-full">
            <option value="contains">contains</option>
            <option value="equals">equals</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Keyword</label>
          <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="e.g., nfpa 10" className="border rounded px-2 py-1 w-full" />
        </div>

        <div>
          <label className="block text-sm mb-1">Sort</label>
          <div className="flex gap-2">
            <select value={sort} onChange={e => setSort(e.target.value as any)} className="border rounded px-2 py-1">
              <option value="clicks">Clicks</option>
              <option value="impressions">Impressions</option>
              <option value="ctr">CTR</option>
              <option value="position">Pos</option>
            </select>
            <select value={dir} onChange={e => setDir(e.target.value as any)} className="border rounded px-2 py-1">
              <option value="desc">desc</option>
              <option value="asc">asc</option>
            </select>
          </div>
        </div>
      </div>

      <button className="px-3 py-2 rounded bg-violet-600 text-white" onClick={run}>Run</button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-3 overflow-auto">
          <table className="min-w-[700px] w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">{dimension === "query" ? "Query" : "Page"}</th>
                <th className="py-2 pr-4">Clicks</th>
                <th className="py-2 pr-4">Impr.</th>
                <th className="py-2 pr-4">CTR</th>
                <th className="py-2 pr-4">Avg Pos</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b last:border-b-0">
                  <td className="py-2 pr-4">{r.key}</td>
                  <td className="py-2 pr-4">{r.clicks}</td>
                  <td className="py-2 pr-4">{r.impressions}</td>
                  <td className="py-2 pr-4">{(r.ctr * 100).toFixed(1)}%</td>
                  <td className="py-2 pr-4">{r.position.toFixed(1)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td className="py-6 text-gray-500" colSpan={5}>Run the tracker to see results.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="border rounded p-3">
          <div className="font-medium mb-2">Top 10 by Clicks</div>
          <BarChartModern labels={bars.map(b => b.label)} data={bars.map(b => b.value)} />
          <div className="text-xs text-gray-500 mt-2">Bars show top 10 rows scaled by clicks.</div>
        </div>
      </div>
    </div>
  );
}
