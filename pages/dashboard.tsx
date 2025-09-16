// pages/dashboard.tsx
import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import GSCSitePicker from "@/components/GSCSitePicker";
import { LineChartModern } from "@/components/ChartKit";

type GAProperty = { name: string; propertyId: string; displayName?: string };

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [gaProperty, setGAProperty] = useState<GAProperty | null>(null);
  const [siteUrl, setSiteUrl] = useState<string>("");

  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");

  const [labels, setLabels] = useState<string[]>([]);
  const [gaSessions, setGaSessions] = useState<number[]>([]);
  const [gaActiveUsers, setGaActiveUsers] = useState<number[]>([]);
  const [gscClicks, setGscClicks] = useState<number[]>([]);
  const [gscImpressions, setGscImpressions] = useState<number[]>([]);

  const [gaTopPages, setGaTopPages] = useState<{ path: string; value: number }[]>([]);
  const [gscTopQueries, setGscTopQueries] = useState<
    { query: string; clicks: number; impressions: number; ctr: number; pos: number }[]
  >([]);

  useEffect(() => {
    // default to last 28 days
    const today = new Date();
    const endISO = today.toISOString().slice(0, 10);
    const startDt = new Date(today);
    startDt.setDate(startDt.getDate() - 28);
    const startISO = startDt.toISOString().slice(0, 10);
    setStart(startISO);
    setEnd(endISO);
  }, []);

  async function run() {
    if (!start || !end) return;

    // fetch GA time series (sessions, active users)
    if (gaProperty?.propertyId) {
      const r1 = await fetch(`/api/ga/timeseries?propertyId=${gaProperty.propertyId}&start=${start}&end=${end}`);
      const js1 = await r1.json();
      setLabels(js1.labels || []);
      setGaSessions(js1.sessions || []);
      setGaActiveUsers(js1.activeUsers || []);

      const r2 = await fetch(`/api/ga/top-pages?propertyId=${gaProperty.propertyId}&start=${start}&end=${end}`);
      const js2 = await r2.json();
      setGaTopPages(js2.rows || []);
    }

    // fetch GSC time series + top queries
    if (siteUrl) {
      const r3 = await fetch(
        `/api/gsc/timeseries?siteUrl=${encodeURIComponent(siteUrl)}&start=${start}&end=${end}`
      );
      const js3 = await r3.json();
      setGscClicks(js3.clicks || []);
      setGscImpressions(js3.impressions || []);

      const r4 = await fetch(
        `/api/gsc/top-queries?siteUrl=${encodeURIComponent(siteUrl)}&start=${start}&end=${end}`
      );
      const js4 = await r4.json();
      setGscTopQueries(js4.rows || []);
    }
  }

  if (status === "loading") return null;
  if (!session) {
    return (
      <div className="p-6">
        <button
          onClick={() => signIn("google")}
          className="px-4 py-2 rounded bg-black text-white"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-sm mb-1">GA4 Property (optional)</div>
          {/* Your existing GA property picker goes here if you have one */}
          {/* For now we assume gaProperty already set somewhere else */}
        </div>
        <div>
          <div className="text-sm mb-1">GSC Site (optional)</div>
          <GSCSitePicker value={siteUrl} onChange={setSiteUrl} />
        </div>
        <div>
          <div className="text-sm mb-1">Start</div>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="border rounded p-2 w-full"
          />
        </div>
        <div>
          <div className="text-sm mb-1">End</div>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="border rounded p-2 w-full"
          />
        </div>
      </div>

      <button onClick={run} className="px-4 py-2 bg-violet-600 text-white rounded">
        Run
      </button>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-3">
          <div className="font-medium mb-2">GA4 Sessions (by day)</div>
          <LineChartModern labels={labels} data={gaSessions} />
        </div>

        <div className="border rounded p-3">
          <div className="font-medium mb-2">GA4 Active Users (by day)</div>
          <LineChartModern labels={labels} data={gaActiveUsers} />
        </div>

        <div className="border rounded p-3">
          <div className="font-medium mb-2">GSC Clicks (by day)</div>
          <LineChartModern labels={labels} data={gscClicks} />
        </div>

        <div className="border rounded p-3">
          <div className="font-medium mb-2">GSC Impressions (by day)</div>
          <LineChartModern labels={labels} data={gscImpressions} />
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded">
          <div className="px-3 py-2 border-b font-medium">GA4 Top Pages</div>
          <table className="w-full text-sm">
            <tbody>
              {gaTopPages.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2 truncate">{r.path}</td>
                  <td className="px-3 py-2 text-right">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border rounded">
          <div className="px-3 py-2 border-b font-medium">GSC Top Queries</div>
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
              {gscTopQueries.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2 truncate">{r.query}</td>
                  <td className="px-3 py-2 text-right">{r.clicks}</td>
                  <td className="px-3 py-2 text-right">{r.impressions}</td>
                  <td className="px-3 py-2 text-right">{(r.ctr * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right">{r.pos.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
