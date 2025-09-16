import { useEffect, useMemo, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import GSCSitePicker from "@/components/GSCSitePicker";
import CountrySelect from "@/components/CountrySelect";
import { BarChartModern } from "@/components/ChartKit";

type Row = { key: string; clicks: number; impressions: number; ctr: number; position: number };

export default function TrackerPage() {
  const { data: session, status } = useSession();
  const [siteUrl, setSiteUrl] = useState<string>("");
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");
  const [keywordMode, setKeywordMode] = useState<"contains" | "equals">("contains");
  const [dimension, setDimension] = useState<"QUERY" | "PAGE" | "COUNTRY" | "DEVICE">("QUERY");
  const [device, setDevice] = useState<"" | "DESKTOP" | "MOBILE" | "TABLET">("");
  const [countryCode, setCountryCode] = useState<string | undefined>(undefined); // <-- accepts undefined
  const [rowLimit, setRowLimit] = useState<number>(25);
  const [sortKey, setSortKey] = useState<"clicks" | "impressions" | "ctr" | "position">("clicks");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    // default last 28 days
    const endD = new Date();
    const startD = new Date();
    startD.setDate(endD.getDate() - 28);
    setEnd(endD.toISOString().slice(0, 10));
    setStart(startD.toISOString().slice(0, 10));
  }, []);

  const top10 = useMemo(
    () => rows.slice(0, 10),
    [rows]
  );

  async function run() {
    if (!siteUrl || !start || !end) return;
    setLoading(true);
    try {
      const body: any = {
        siteUrl,
        startDate: start,
        endDate: end,
        rowLimit,
        dimension, // server can map to GSC dim
        keyword,
        keywordMode,
        sortKey,
        sortDir,
      };
      if (device) body.device = device;
      if (countryCode) body.country = countryCode; // e.g. "COUNTRY_US"

      // NOTE: keep this endpoint name matching your existing API route
      const res = await fetch("/api/gsc/tracker", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { rows: Row[] };
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    const header = "key,clicks,impressions,ctr,position\n";
    const lines = rows.map(
      (r) => `"${(r.key || "").replace(/"/g, '""')}",${r.clicks},${r.impressions},${(r.ctr * 100).toFixed(2)}%,${r.position.toFixed(1)}`
    );
    const blob = new Blob([header + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "organic-tracker.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (status === "loading") return null;
  if (!session) {
    return (
      <div className="p-6">
        <button
          onClick={() => signIn("google")}
          className="px-4 py-2 rounded bg-black text-white"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Organic Tracker</h1>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm mb-1">GSC Property</label>
          <GSCSitePicker value={siteUrl} onChange={setSiteUrl} />
        </div>

        <div>
          <label className="block text-sm mb-1">Dimension</label>
          <select
            className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
            value={dimension}
            onChange={(e) => setDimension(e.target.value as any)}
          >
            <option value="QUERY">Query</option>
            <option value="PAGE">Page</option>
            <option value="COUNTRY">Country</option>
            <option value="DEVICE">Device</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Row limit</label>
          <input
            type="number"
            className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
            value={rowLimit}
            onChange={(e) => setRowLimit(Math.max(1, parseInt(e.target.value || "1", 10)))}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Device (optional)</label>
          <select
            className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
            value={device}
            onChange={(e) => setDevice(e.target.value as any)}
          >
            <option value="">All</option>
            <option value="DESKTOP">Desktop</option>
            <option value="MOBILE">Mobile</option>
            <option value="TABLET">Tablet</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Country (optional)</label>
          <CountrySelect value={countryCode} onChange={setCountryCode} />
        </div>

        <div>
          <label className="block text-sm mb-1">Start</label>
          <input
            type="date"
            className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">End</label>
          <input
            type="date"
            className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>

        <div className="md:col-span-2 lg:col-span-2">
          <label className="block text-sm mb-1">Keyword contains / equals</label>
          <div className="flex gap-2">
            <select
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
              value={keywordMode}
              onChange={(e) => setKeywordMode(e.target.value as any)}
            >
              <option value="contains">contains</option>
              <option value="equals">equals</option>
            </select>
            <input
              type="text"
              placeholder="keyword…"
              className="flex-1 h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Sort</label>
          <div className="flex gap-2">
            <select
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as any)}
            >
              <option value="clicks">Clicks</option>
              <option value="impressions">Impr.</option>
              <option value="ctr">CTR</option>
              <option value="position">Avg Pos</option>
            </select>
            <select
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as any)}
            >
              <option value="desc">desc</option>
              <option value="asc">asc</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50"
          onClick={run}
          disabled={loading || !siteUrl}
        >
          {loading ? "Running…" : "Run"}
        </button>
        <button
          className="px-4 py-2 rounded border border-gray-300"
          onClick={downloadCSV}
          disabled={!rows.length}
        >
          Download CSV
        </button>
        <div className="ml-auto text-sm text-gray-500">
          {session?.user?.email}{" "}
          <button className="underline" onClick={() => signOut()}>Sign out</button>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 overflow-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Query</th>
                <th className="px-3 py-2 text-right font-medium">Clicks</th>
                <th className="px-3 py-2 text-right font-medium">Impr.</th>
                <th className="px-3 py-2 text-right font-medium">CTR</th>
                <th className="px-3 py-2 text-right font-medium">Avg Pos</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t">
                  <td className="px-3 py-2">{r.key}</td>
                  <td className="px-3 py-2 text-right">{r.clicks}</td>
                  <td className="px-3 py-2 text-right">{r.impressions}</td>
                  <td className="px-3 py-2 text-right">{(r.ctr * 100).toFixed(2)}%</td>
                  <td className="px-3 py-2 text-right">{r.position.toFixed(1)}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td className="px-3 py-8 text-gray-500" colSpan={5}>
                    Run the tracker to see Top results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <BarChartModern
          title="Top 10 by Clicks"
          labels={top10.map((r) => r.key)}
          data={top10.map((r) => r.clicks)}
        />
      </div>
    </div>
  );
}
