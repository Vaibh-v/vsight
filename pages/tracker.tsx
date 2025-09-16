// pages/tracker.tsx
import React, { useMemo, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import GSCSitePicker from "@/components/GSCSitePicker";
import CountrySelect from "@/components/CountrySelect";
import { BarChartModern } from "@/components/ChartKit";

type Row = { key: string; clicks: number; impressions: number; ctr: number; position: number };

const toISO = (d?: string) => {
  if (!d) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d; // already yyyy-mm-dd
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d); // dd/mm/yyyy
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const dt = new Date(d);
  return Number.isFinite(dt.valueOf()) ? dt.toISOString().slice(0, 10) : undefined;
};

export default function TrackerPage() {
  const { data: session } = useSession();
  const [site, setSite] = useState<string | undefined>(undefined);

  const [dimension, setDimension] = useState<"Query" | "Page">("Query");
  const [limit, setLimit] = useState<number>(25);
  const [device, setDevice] = useState<"" | "Desktop" | "Mobile" | "Tablet">("");
  const [country, setCountry] = useState<string | undefined>(undefined); // API code (COUNTRY_US), undefined = all
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");

  const [kwMode, setKwMode] = useState<"contains" | "equals">("contains");
  const [kw, setKw] = useState<string>("");

  const [sortBy, setSortBy] = useState<"Clicks" | "Impressions" | "CTR" | "AvgPos">("Clicks");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // simple auth gate
  if (!session) {
    return (
      <div className="p-6">
        <button className="px-3 py-2 rounded bg-violet-600 text-white" onClick={() => signIn()}>
          Sign in
        </button>
      </div>
    );
  }

  const run = async () => {
    setLoading(true);
    setError(null);
    setRows([]);

    try {
      const startISO = toISO(start) ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const endISO = toISO(end) ?? new Date().toISOString().slice(0, 10);

      const body = {
        siteUrl: site,
        startDate: startISO,
        endDate: endISO,
        dimension: dimension.toUpperCase(), // QUERY | PAGE
        limit,
        device: device ? device.toUpperCase() : undefined, // DESKTOP | MOBILE | TABLET
        country, // already API code or undefined
        keywordMode: kw ? kwMode : undefined,
        keyword: kw ? kw.trim() : undefined,
        sortBy: sortBy.toLowerCase(), // clicks | impressions | ctr | avgpos
        sortDir,
      };

      // 🔧 change this path if your API endpoint is different:
      const r = await fetch("/api/gsc/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await r.json();
      if (!r.ok) throw new Error(json.error?.message || r.statusText);

      const mapped: Row[] =
        (json.rows ?? []).map((x: any) => ({
          key: x.key ?? x.query ?? x.page ?? "",
          clicks: Number(x.clicks ?? 0),
          impressions: Number(x.impressions ?? 0),
          ctr: Number(x.ctr ?? 0),
          position: Number(x.position ?? 0),
        })) ?? [];

      setRows(mapped);
    } catch (e: any) {
      setError(e?.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const top10 = useMemo(() => {
    const sorted = [...rows].sort((a, b) => b.clicks - a.clicks);
    return sorted.slice(0, 10);
  }, [rows]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold">Organic Tracker</h1>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="col-span-2">
          <label className="block text-sm mb-1">GSC Property</label>
          <GSCSitePicker value={site} onChange={setSite} />
        </div>

        <div>
          <label className="block text-sm mb-1">Dimension</label>
          <select
            value={dimension}
            onChange={(e) => setDimension(e.target.value as any)}
            className="border rounded px-2 py-1 w-full"
          >
            <option>Query</option>
            <option>Page</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Row limit</label>
          <input
            type="number"
            className="border rounded px-2 py-1 w-full"
            value={limit}
            min={1}
            max={1000}
            onChange={(e) => setLimit(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Country (optional)</label>
          <CountrySelect value={country} onChange={setCountry} />
        </div>

        <div>
          <label className="block text-sm mb-1">Device (optional)</label>
          <select
            value={device}
            onChange={(e) => setDevice(e.target.value as any)}
            className="border rounded px-2 py-1 w-full"
          >
            <option value="">All</option>
            <option>Desktop</option>
            <option>Mobile</option>
            <option>Tablet</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Start</label>
          <input
            type="date"
            className="border rounded px-2 py-1 w-full"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">End</label>
          <input
            type="date"
            className="border rounded px-2 py-1 w-full"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm mb-1">Keyword contains / equals</label>
          <div className="flex gap-2">
            <select
              value={kwMode}
              onChange={(e) => setKwMode(e.target.value as any)}
              className="border rounded px-2 py-1"
            >
              <option value="contains">contains</option>
              <option value="equals">equals</option>
            </select>
            <input
              className="border rounded px-2 py-1 flex-1"
              value={kw}
              placeholder="e.g., nfpa 10"
              onChange={(e) => setKw(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Sort</label>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border rounded px-2 py-1"
            >
              <option>Clicks</option>
              <option>Impressions</option>
              <option>CTR</option>
              <option>AvgPos</option>
            </select>
            <select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as any)}
              className="border rounded px-2 py-1"
            >
              <option value="desc">desc</option>
              <option value="asc">asc</option>
            </select>
          </div>
        </div>

        <div className="flex items-end">
          <button
            onClick={run}
            className="px-3 py-2 rounded bg-violet-600 text-white disabled:opacity-60"
            disabled={loading || !site}
          >
            {loading ? "Running…" : "Run"}
          </button>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border rounded">
          <div className="px-3 py-2 font-medium border-b">Results</div>
          <div className="p-3 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-3">Query / Page</th>
                  <th className="py-2 pr-3">Clicks</th>
                  <th className="py-2 pr-3">Impr.</th>
                  <th className="py-2 pr-3">CTR</th>
                  <th className="py-2 pr-3">Avg Pos</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td className="py-6 text-gray-500" colSpan={5}>
                      Run the tracker to see results.
                    </td>
                  </tr>
                )}
                {rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-2 pr-3">{r.key}</td>
                    <td className="py-2 pr-3">{r.clicks}</td>
                    <td className="py-2 pr-3">{r.impressions}</td>
                    <td className="py-2 pr-3">
                      {Number.isFinite(r.ctr) ? `${(r.ctr * 100).toFixed(2)}%` : "-"}
                    </td>
                    <td className="py-2 pr-3">
                      {Number.isFinite(r.position) ? r.position.toFixed(1) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border rounded">
          <div className="px-3 py-2 font-medium border-b">Top 10 by Clicks</div>
          <div className="p-3">
            <BarChartModern
              title=""
              labels={top10.map((r) => r.key)}
              data={top10.map((r) => r.clicks)}
              height={280}
            />
            <div className="text-xs text-gray-500 mt-2">Bars show top 10 rows scaled by clicks.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
