// pages/dashboard.tsx
import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { LineChartMini } from "@/components/ChartKit";
import GSCSitePicker from "@/components/GSCSitePicker";
import { safeFetchJSON, toISO } from "@/lib/safeFetch";

type Series = { date: string; value: number };
type TopRow = { name: string; a: number; b?: number; c?: number; d?: number };

export default function Dashboard() {
  const { status } = useSession();
  const [siteUrl, setSiteUrl] = useState<string | undefined>();
  const [start, setStart] = useState(toISO(new Date(Date.now() - 28 * 864e5))!);
  const [end, setEnd] = useState(toISO(new Date())!);
  const [labels, setLabels] = useState<string[]>([]);
  const [gscClicks, setGscClicks] = useState<number[]>([]);
  const [gscImpr, setGscImpr] = useState<number[]>([]);
  const [gaSessions, setGaSessions] = useState<number[]>([]);
  const [gaUsers, setGaUsers] = useState<number[]>([]);
  const [topQueries, setTopQueries] = useState<TopRow[]>([]);
  const [topPages, setTopPages] = useState<TopRow[]>([]);
  const [error, setError] = useState("");

  const run = async () => {
    setError("");
    try {
      // Make dates
      const s = start; const e = end;

      // GSC daily clicks/impr
      if (siteUrl) {
        const daily = await safeFetchJSON<{ clicks: Series[]; impressions: Series[] }>(
          `/api/gsc/daily?site=${encodeURIComponent(siteUrl)}&start=${s}&end=${e}`
        );
        const lab = daily.clicks.map(d => d.date) || [];
        setLabels(lab);
        setGscClicks(daily.clicks.map(d => d.value || 0));
        setGscImpr(daily.impressions.map(d => d.value || 0));

        const tops = await safeFetchJSON<{ queries: TopRow[]; pages: TopRow[] }>(
          `/api/gsc/tops?site=${encodeURIComponent(siteUrl)}&start=${s}&end=${e}`
        );
        setTopQueries(tops.queries || []);
        setTopPages(tops.pages || []);
      } else {
        setLabels([]); setGscClicks([]); setGscImpr([]); setTopQueries([]); setTopPages([]);
      }

      // GA4 optional (leave empty if no property selected on your side)
      // Keep arrays same length as labels; if missing, they’ll render as 0s.
      setGaSessions(Array(labels.length).fill(0));
      setGaUsers(Array(labels.length).fill(0));
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };

  useEffect(() => { /* no auto-run */ }, []);

  if (status === "unauthenticated") {
    return (
      <div className="p-6">
        <p className="mb-3">Sign in to view the Dashboard.</p>
        <button className="px-3 py-2 rounded bg-black text-white" onClick={() => signIn()}>Sign in</button>
      </div>
    );
  }

  const safeLabels = labels || [];
  const pad = (arr: number[]) => (arr?.length ? arr : Array(safeLabels.length).fill(0));

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="col-span-2">
          <label className="block text-sm mb-1">GSC Site (optional)</label>
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
          <button className="px-3 py-2 rounded bg-purple-600 text-white" onClick={run}>Run</button>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-3">
          <div className="font-medium mb-2">GA4 Sessions (by day)</div>
          <LineChartMini labels={safeLabels} data={pad(gaSessions)} />
        </div>
        <div className="border rounded p-3">
          <div className="font-medium mb-2">GA4 Active Users (by day)</div>
          <LineChartMini labels={safeLabels} data={pad(gaUsers)} />
        </div>
        <div className="border rounded p-3">
          <div className="font-medium mb-2">GSC Clicks (by day)</div>
          <LineChartMini labels={safeLabels} data={pad(gscClicks)} />
        </div>
        <div className="border rounded p-3">
          <div className="font-medium mb-2">GSC Impressions (by day)</div>
          <LineChartMini labels={safeLabels} data={pad(gscImpr)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-3 overflow-auto">
          <div className="font-medium mb-2">GA4 Top Pages</div>
          <SimpleTable rows={topPages} nameHeader="Page" />
        </div>
        <div className="border rounded p-3 overflow-auto">
          <div className="font-medium mb-2">GSC Top Queries</div>
          <SimpleTable rows={topQueries} nameHeader="Query" />
        </div>
      </div>
    </div>
  );
}

function SimpleTable({ rows, nameHeader }: { rows: TopRow[]; nameHeader: string }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left border-b">
          <th className="py-2">{nameHeader}</th>
          <th className="py-2">Clicks</th>
          <th className="py-2">Impr.</th>
          <th className="py-2">CTR</th>
          <th className="py-2">Pos</th>
        </tr>
      </thead>
      <tbody>
        {(!rows || rows.length === 0) && (
          <tr><td colSpan={5} className="py-4 text-gray-500">No data.</td></tr>
        )}
        {rows?.map((r, i) => (
          <tr key={i} className="border-b last:border-0">
            <td className="py-2 break-all">{r.name}</td>
            <td className="py-2">{r.a ?? 0}</td>
            <td className="py-2">{r.b ?? 0}</td>
            <td className="py-2">{typeof r.c === "number" ? `${(r.c * 100).toFixed(2)}%` : "0.00%"}</td>
            <td className="py-2">{typeof r.d === "number" ? r.d.toFixed(1) : "0.0"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
