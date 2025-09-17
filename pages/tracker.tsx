// pages/tracker.tsx
import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import GSCSitePicker from "@/components/GSCSitePicker";
import CountrySelect from "@/components/CountrySelect";
import { BarChartModern } from "@/components/ChartKit";

// ---------- tiny safe fetch so we don't crash on HTML errors ----------
async function fetchJSON<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  if (!ct.includes("application/json")) {
    throw new Error(`Expected JSON, got ${ct}. Body starts: ${text.slice(0, 200)}`);
  }
  return JSON.parse(text) as T;
}

const toYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const assertYmd = (s: string, label: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(`${label} must be YYYY-MM-DD`);
};

type Row = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

export default function Tracker() {
  const { data: session } = useSession();

  // ---- STATE (note country is string | undefined) ----
  const [siteUrl, setSiteUrl] = useState<string | undefined>();
  const [dimension, setDimension] = useState<"query" | "page">("page");
  const [country, setCountry] = useState<string | undefined>(undefined);
  const [device, setDevice] = useState<"All" | "Desktop" | "Mobile" | "Tablet">("All");
  const [keywordMode, setKeywordMode] = useState<"contains" | "equals">("contains");
  const [keywordValue, setKeywordValue] = useState<string>("");
  const [rowLimit] = useState<number>(25);

  const [start, setStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toYmd(d);
  });
  const [end, setEnd] = useState<string>(() => toYmd(new Date()));

  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string>("");

  if (!session) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="text-xl mb-4">Organic Tracker</div>
        <button className="px-3 py-2 bg-black text-white rounded" onClick={() => signIn()}>
          Sign in
        </button>
      </div>
    );
  }

  async function run() {
    try {
      setError("");
      setRows([]);

      if (!siteUrl) throw new Error("Select a GSC property first.");
      assertYmd(start, "Start");
      assertYmd(end, "End");

      // Build payload expected by /api/gsc/query (Search Console)
      const payload = {
        siteUrl,
        startDate: start,
        endDate: end,
        dimension,            // "query" | "page"
        rowLimit,             // 25
        countryCode: country, // e.g. "COUNTRY_US" or undefined
        device: device === "All" ? undefined : device,
        keywordMode,          // "contains" | "equals"
        keywordValue: keywordValue.trim() || undefined,
        sortBy: "clicks",
        sortDir: "desc",
      };

      const data = await fetchJSON<{ rows: Row[] }>("/api/gsc/query", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto p-6 space-y-5">
      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">GSC Property</label>
          <GSCSitePicker value={siteUrl} onChange={setSiteUrl} />
        </div>

        <div>
          <label className="block text-sm mb-1">Dimension</label>
          <select
            value={dimension}
            onChange={(e) => setDimension(e.target.value as "query" | "page")}
            className="border rounded px-2 py-1 w-full"
          >
            <option value="page">Page</option>
            <option value="query">Query</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Country (optional)</label>
          {/* FIX: onChange expects (v: string | undefined) => void; state is string | undefined */}
          <CountrySelect value={country} onChange={(v) => setCountry(v)} />
        </div>

        <div>
          <label className="block text-sm mb-1">Device (optional)</label>
          <select
            value={device}
            onChange={(e) => setDevice(e.target.value as any)}
            className="border rounded px-2 py-1 w-full"
          >
            <option>All</option>
            <option>Desktop</option>
            <option>Mobile</option>
            <option>Tablet</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Start</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="border rounded px-2 py-1 w-full"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">End</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="border rounded px-2 py-1 w-full"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Keyword mode</label>
          <select
            value={keywordMode}
            onChange={(e) => setKeywordMode(e.target.value as any)}
            className="border rounded px-2 py-1 w-full"
          >
            <option value="contains">contains</option>
            <option value="equals">equals</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Keyword</label>
          <input
            value={keywordValue}
            onChange={(e) => setKeywordValue(e.target.value)}
            placeholder="e.g., nfpa 10"
            className="border rounded px-2 py-1 w-full"
          />
        </div>

        <div className="flex items-end">
          <button className="px-3 py-2 rounded bg-violet-600 text-white" onClick={run}>
            Run
          </button>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {/* Results + quick viz */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-3 border rounded p-3 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">{dimension === "page" ? "Page" : "Query"}</th>
                <th className="py-2">Clicks</th>
                <th className="py-2">Impr.</th>
                <th className="py-2">CTR</th>
                <th className="py-2">Avg Pos</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-gray-500">
                    Run the tracker to see results.
                  </td>
                </tr>
              )}
              {rows.map((r, i) => (
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

        <div className="md:col-span-2 border rounded p-3">
          <div className="font-medium mb-2">Top 10 by Clicks</div>
          <BarChartModern
            labels={rows.slice(0, 10).map((r) => r.keys?.[0] ?? "")}
            data={rows.slice(0, 10).map((r) => r.clicks ?? 0)}
            height={300}
          />
        </div>
      </div>
    </div>
  );
}
