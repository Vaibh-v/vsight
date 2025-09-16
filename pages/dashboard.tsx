import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import GAPropertyPicker from "@/components/GAPropertyPicker";
import GSCSitePicker from "@/components/GSCSitePicker";
import { LineChartMini } from "@/components/ChartKit";

type SeriesPoint = { date: string; value: number };

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [gaPropertyId, setGaPropertyId] = useState<string>("");
  const [gscSiteUrl, setGscSiteUrl] = useState<string>("");
  const [start, setStart] = useState<string>("2025-08-20");
  const [end, setEnd] = useState<string>("2025-09-16");

  const [gaSessions, setGaSessions] = useState<SeriesPoint[]>([]);
  const [gaUsers, setGaUsers] = useState<SeriesPoint[]>([]);
  const [gscClicks, setGscClicks] = useState<SeriesPoint[]>([]);
  const [gscImpr, setGscImpr] = useState<SeriesPoint[]>([]);
  const [gscTop, setGscTop] = useState<Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>>([]);

  async function run() {
    try {
      const body = { start, end, gaPropertyId, gscSiteUrl };

      // GA4
      if (gaPropertyId) {
        const [sess, users] = await Promise.all([
          fetch("/api/ga4/timeseries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, metric: "sessions" }) }).then(r => r.json()),
          fetch("/api/ga4/timeseries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, metric: "activeUsers" }) }).then(r => r.json()),
        ]);
        setGaSessions(sess.points ?? []);
        setGaUsers(users.points ?? []);
      } else {
        setGaSessions([]);
        setGaUsers([]);
      }

      // GSC
      if (gscSiteUrl) {
        const [clicks, impr, top] = await Promise.all([
          fetch("/api/gsc/timeseries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ siteUrl: gscSiteUrl, start, end, metric: "clicks" }) }).then(r => r.json()),
          fetch("/api/gsc/timeseries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ siteUrl: gscSiteUrl, start, end, metric: "impressions" }) }).then(r => r.json()),
          fetch("/api/gsc/top-queries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ siteUrl: gscSiteUrl, start, end, rowLimit: 10 }) }).then(r => r.json()),
        ]);
        setGscClicks(clicks.points ?? []);
        setGscImpr(impr.points ?? []);
        setGscTop(top.rows ?? []);
      } else {
        setGscClicks([]);
        setGscImpr([]);
        setGscTop([]);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to run dashboard. See console for details.");
    }
  }

  if (status === "loading") return null;
  if (!session) return <div className="p-6"><button className="px-3 py-2 rounded bg-black text-white" onClick={() => signIn()}>Sign in</button></div>;

  const labels = (arr: SeriesPoint[]) => arr.map(p => p.date);
  const values = (arr: SeriesPoint[]) => arr.map(p => p.value);

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">GA4 Property</label>
          <GAPropertyPicker value={gaPropertyId} onChange={setGaPropertyId} />
        </div>
        <div>
          <label className="block text-sm mb-1">GSC Site (optional)</label>
          <GSCSitePicker value={gscSiteUrl} onChange={setGscSiteUrl} />
        </div>
        <div>
          <label className="block text-sm mb-1">Start</label>
          <input value={start} onChange={e => setStart(e.target.value)} type="date" className="border rounded px-2 py-1 w-full" />
        </div>
        <div>
          <label className="block text-sm mb-1">End</label>
          <input value={end} onChange={e => setEnd(e.target.value)} type="date" className="border rounded px-2 py-1 w-full" />
        </div>
      </div>

      <button onClick={run} className="px-3 py-2 rounded bg-violet-600 text-white">Run</button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-3">
          <div className="font-medium mb-2">GA4 Sessions (by day)</div>
          <LineChartMini labels={labels(gaSessions)} data={values(gaSessions)} />
        </div>
        <div className="border rounded p-3">
          <div className="font-medium mb-2">GA4 Active Users (by day)</div>
          <LineChartMini labels={labels(gaUsers)} data={values(gaUsers)} />
        </div>
        <div className="border rounded p-3">
          <div className="font-medium mb-2">GSC Clicks (by day)</div>
          <LineChartMini labels={labels(gscClicks)} data={values(gscClicks)} />
        </div>
        <div className="border rounded p-3">
          <div className="font-medium mb-2">GSC Impressions (by day)</div>
          <LineChartMini labels={labels(gscImpr)} data={values(gscImpr)} />
        </div>
      </div>

      <div className="border rounded p-3">
        <div className="font-medium mb-2">GSC Top Queries</div>
        <div className="overflow-auto">
          <table className="min-w-[600px] w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Query</th>
                <th className="py-2 pr-4">Clicks</th>
                <th className="py-2 pr-4">Impr.</th>
                <th className="py-2 pr-4">CTR</th>
                <th className="py-2 pr-4">Pos</th>
              </tr>
            </thead>
            <tbody>
              {gscTop.map((r, i) => (
                <tr key={i} className="border-b last:border-b-0">
                  <td className="py-2 pr-4">{r.query}</td>
                  <td className="py-2 pr-4">{r.clicks}</td>
                  <td className="py-2 pr-4">{r.impressions}</td>
                  <td className="py-2 pr-4">{(r.ctr * 100).toFixed(1)}%</td>
                  <td className="py-2 pr-4">{r.position.toFixed(1)}</td>
                </tr>
              ))}
              {gscTop.length === 0 && (
                <tr><td className="py-6 text-gray-500" colSpan={5}>No data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
