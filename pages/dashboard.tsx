// pages/dashboard.tsx
import { useEffect, useMemo, useState } from 'react';
import { useSession, signIn, signOut } from "next-auth/react";
import GSCSitePicker from "@/components/GSCSitePicker"; // existing
import MiniLine from "@/components/MiniLine";
import { fetchJSON, toYmd, safeNum, assertDateString } from "@/lib/fetcher";

type SeriesResp = { labels: string[]; values: number[] };
type TableRow = { name: string; value: number };
type QueryRow = { query: string; clicks: number; impressions: number; ctr: number; position: number };

export default function Dashboard() {
  const { data: session } = useSession();
  const [gaPropertyId, setGaPropertyId] = useState<string>("");
  const [gscSite, setGscSite] = useState<string>("");
  const [start, setStart] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 28); return toYmd(d);
  });
  const [end, setEnd] = useState<string>(() => toYmd(new Date()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Data
  const [gaSessions, setGaSessions] = useState<number[]>([]);
  const [gaActive, setGaActive] = useState<number[]>([]);
  const [gscClicks, setGscClicks] = useState<number[]>([]);
  const [gscImpr, setGscImpr] = useState<number[]>([]);
  const [gaTopPages, setGaTopPages] = useState<TableRow[]>([]);
  const [gscTopQueries, setGscTopQueries] = useState<QueryRow[]>([]);

  const canRun = !!session;

  async function run() {
    try {
      setError("");
      setLoading(true);
      assertDateString(start, "Start");
      assertDateString(end, "End");

      // Parallel calls, but only when a key is provided.
      const tasks: Promise<any>[] = [];

      if (gaPropertyId) {
        tasks.push(
          (async () => {
            const s1 = await fetchJSON<SeriesResp>(`/api/ga4/timeseries?propertyId=${encodeURIComponent(gaPropertyId)}&metric=sessions&start=${start}&end=${end}`);
            const s2 = await fetchJSON<SeriesResp>(`/api/ga4/timeseries?propertyId=${encodeURIComponent(gaPropertyId)}&metric=activeUsers&start=${start}&end=${end}`);
            setGaSessions(s1.values.map(v => safeNum(v)));
            setGaActive(s2.values.map(v => safeNum(v)));

            const top = await fetchJSON<{ rows: { name: string; value: number }[] }>(`/api/ga4/top-pages?propertyId=${encodeURIComponent(gaPropertyId)}&start=${start}&end=${end}`);
            setGaTopPages(top.rows || []);
          })()
        );
      } else {
        setGaSessions([]); setGaActive([]); setGaTopPages([]);
      }

      if (gscSite) {
        tasks.push(
          (async () => {
            const c = await fetchJSON<SeriesResp>(`/api/gsc/timeseries?site=${encodeURIComponent(gscSite)}&metric=clicks&start=${start}&end=${end}`);
            const i = await fetchJSON<SeriesResp>(`/api/gsc/timeseries?site=${encodeURIComponent(gscSite)}&metric=impressions&start=${start}&end=${end}`);
            setGscClicks(c.values.map(v => safeNum(v)));
            setGscImpr(i.values.map(v => safeNum(v)));

            const q = await fetchJSON<{ rows: QueryRow[] }>(`/api/gsc/top-queries?site=${encodeURIComponent(gscSite)}&start=${start}&end=${end}`);
            setGscTopQueries(q.rows || []);
          })()
        );
      } else {
        setGscClicks([]); setGscImpr([]); setGscTopQueries([]);
      }

      await Promise.all(tasks);
    } catch (e:any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Auto-run only if at least one source is selected
    if (gaPropertyId || gscSite) run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!session) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="text-xl mb-4">Dashboard</div>
        <button className="px-3 py-2 bg-black text-white rounded" onClick={() => signIn()}>Sign in</button>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div>
          <label className="block text-sm mb-1">GA4 Property ID (optional)</label>
          <input
            value={gaPropertyId}
            onChange={e => setGaPropertyId(e.target.value.trim())}
            placeholder="ex: 3765969838"
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">GSC Site (optional)</label>
          <GSCSitePicker value={gscSite} onChange={setGscSite} />
        </div>

        <div>
          <label className="block text-sm mb-1">Start</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className="border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">End</label>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="border rounded px-3 py-2" />
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <button onClick={run} disabled={loading || !canRun}
          className="px-3 py-2 rounded bg-violet-600 text-white disabled:opacity-60">Run</button>
        {error && <div className="text-red-600 text-sm">{error}</div>}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div>
          <div className="mb-2 font-medium">GA4 Sessions (by day)</div>
          <MiniLine data={gaSessions} />
        </div>
        <div>
          <div className="mb-2 font-medium">GA4 Active Users (by day)</div>
          <MiniLine data={gaActive} />
        </div>
        <div>
          <div className="mb-2 font-medium">GSC Clicks (by day)</div>
          <MiniLine data={gscClicks} />
        </div>
        <div>
          <div className="mb-2 font-medium">GSC Impressions (by day)</div>
          <MiniLine data={gscImpr} />
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="border rounded">
          <div className="px-3 py-2 font-medium border-b">GA4 Top Pages</div>
          <table className="w-full text-sm">
            <tbody>
              {gaTopPages?.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-3 py-2 truncate">{r.name}</td>
                  <td className="px-3 py-2 text-right">{safeNum(r.value, 0)}</td>
                </tr>
              ))}
              {!gaTopPages?.length && <tr><td className="px-3 py-3 text-gray-400">No data</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="border rounded">
          <div className="px-3 py-2 font-medium border-b">GSC Top Queries</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-3 py-2">Query</th>
                <th className="px-3 py-2 text-right">Clicks</th>
                <th className="px-3 py-2 text-right">Impr.</th>
                <th className="px-3 py-2 text-right">CTR</th>
                <th className="px-3 py-2 text-right">Pos</th>
              </tr>
            </thead>
            <tbody>
              {gscTopQueries?.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-3 py-2 truncate">{r.query}</td>
                  <td className="px-3 py-2 text-right">{safeNum(r.clicks, 0)}</td>
                  <td className="px-3 py-2 text-right">{safeNum(r.impressions, 0)}</td>
                  <td className="px-3 py-2 text-right">{safeNum(r.ctr * 100, 1)}%</td>
                  <td className="px-3 py-2 text-right">{safeNum(r.position, 1)}</td>
                </tr>
              ))}
              {!gscTopQueries?.length && <tr><td className="px-3 py-3 text-gray-400">No data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
