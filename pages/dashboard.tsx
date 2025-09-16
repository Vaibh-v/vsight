// pages/dashboard.tsx
import React, { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import GAPropertyPicker from "@/components/GAPropertyPicker";
import GSCSitePicker from "@/components/GSCSitePicker";
import { LineChartModern } from "@/components/ChartKit";

type TS = { date: string; value: number };

const safe = (n: unknown, digits = 0) =>
  Number.isFinite(Number(n)) ? Number(n).toFixed(digits) : "-";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [gaProp, setGaProp] = useState<string | undefined>();
  const [gscSite, setGscSite] = useState<string | undefined>();
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");

  const [gaSessions, setGaSessions] = useState<TS[]>([]);
  const [gaUsers, setGaUsers] = useState<TS[]>([]);
  const [gscClicks, setGscClicks] = useState<TS[]>([]);
  const [gscImpr, setGscImpr] = useState<TS[]>([]);
  const [gaTopPages, setGaTopPages] = useState<{ path: string; views: number }[]>([]);
  const [gscTopQueries, setGscTopQueries] = useState<
    { query: string; clicks: number; impressions: number; ctr: number; position: number }[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    try {
      // 🔧 call your existing APIs; below are example endpoints you likely already have
      const payload = { startDate: start, endDate: end, propertyId: gaProp, siteUrl: gscSite };

      const [ga1, ga2, gsc1, gsc2, topPages, topQueries] = await Promise.all([
        fetch("/api/ga/sessionsByDay", { method: "POST", body: JSON.stringify(payload) }).then((r) =>
          r.ok ? r.json() : { rows: [] }
        ),
        fetch("/api/ga/activeUsersByDay", { method: "POST", body: JSON.stringify(payload) }).then((r) =>
          r.ok ? r.json() : { rows: [] }
        ),
        fetch("/api/gsc/clicksByDay", { method: "POST", body: JSON.stringify(payload) }).then((r) =>
          r.ok ? r.json() : { rows: [] }
        ),
        fetch("/api/gsc/impressionsByDay", { method: "POST", body: JSON.stringify(payload) }).then((r) =>
          r.ok ? r.json() : { rows: [] }
        ),
        fetch("/api/ga/topPages", { method: "POST", body: JSON.stringify(payload) }).then((r) =>
          r.ok ? r.json() : { rows: [] }
        ),
        fetch("/api/gsc/topQueries", { method: "POST", body: JSON.stringify(payload) }).then((r) =>
          r.ok ? r.json() : { rows: [] }
        ),
      ]);

      setGaSessions(
        (ga1.rows ?? []).map((x: any) => ({ date: x.date ?? x.day, value: Number(x.value ?? x.sessions ?? 0) }))
      );
      setGaUsers(
        (ga2.rows ?? []).map((x: any) => ({ date: x.date ?? x.day, value: Number(x.value ?? x.users ?? 0) }))
      );
      setGscClicks((gsc1.rows ?? []).map((x: any) => ({ date: x.date ?? x.day, value: Number(x.value ?? 0) })));
      setGscImpr((gsc2.rows ?? []).map((x: any) => ({ date: x.date ?? x.day, value: Number(x.value ?? 0) })));
      setGaTopPages((topPages.rows ?? []).map((x: any) => ({ path: x.path ?? x.pagePath ?? "/", views: Number(x.views ?? 0) })));
      setGscTopQueries(
        (topQueries.rows ?? []).map((x: any) => ({
          query: x.query ?? x.key ?? "",
          clicks: Number(x.clicks ?? 0),
          impressions: Number(x.impressions ?? 0),
          ctr: Number(x.ctr ?? 0),
          position: Number(x.position ?? 0),
        }))
      );
    } catch (e: any) {
      setError(e?.message || "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  const gaLabels = (gaSessions ?? []).map((d) => d.date);
  const gaSessVals = (gaSessions ?? []).map((d) => d.value);
  const gaUserVals = (gaUsers ?? []).map((d) => d.value);
  const gscClickVals = (gscClicks ?? []).map((d) => d.value);
  const gscImprVals = (gscImpr ?? []).map((d) => d.value);
  const gscLabels = (gscClicks ?? []).map((d) => d.date);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold">Default Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">GA4 Property (optional)</label>
          <GAPropertyPicker value={gaProp} onChange={setGaProp} />
        </div>
        <div>
          <label className="block text-sm mb-1">GSC Site (optional)</label>
          <GSCSitePicker value={gscSite} onChange={setGscSite} />
        </div>
        <div>
          <label className="block text-sm mb-1">Start</label>
          <input type="date" className="border rounded px-2 py-1 w-full" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">End</label>
          <input type="date" className="border rounded px-2 py-1 w-full" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>

      <div>
        <button
          onClick={run}
          className="px-3 py-2 rounded bg-violet-600 text-white disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Running…" : "Run"}
        </button>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border rounded p-3">
          <div className="font-medium mb-2">GA4 Sessions (by day)</div>
          <LineChartModern labels={gaLabels ?? []} data={gaSessVals ?? []} />
        </div>
        <div className="border rounded p-3">
          <div className="font-medium mb-2">GA4 Active Users (by day)</div>
          <LineChartModern labels={gaLabels ?? []} data={gaUserVals ?? []} />
        </div>
        <div className="border rounded p-3">
          <div className="font-medium mb-2">GSC Clicks (by day)</div>
          <LineChartModern labels={gscLabels ?? []} data={gscClickVals ?? []} />
        </div>
        <div className="border rounded p-3">
          <div className="font-medium mb-2">GSC Impressions (by day)</div>
          <LineChartModern labels={gscLabels ?? []} data={gscImprVals ?? []} />
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border rounded">
          <div className="px-3 py-2 font-medium border-b">GA4 Top Pages</div>
          <div className="p-3">
            <table className="w-full text-sm">
              <tbody>
                {gaTopPages.map((p, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-2 pr-3">{p.path}</td>
                    <td className="py-2 pr-3 text-right">{safe(p.views)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border rounded">
          <div className="px-3 py-2 font-medium border-b">GSC Top Queries</div>
          <div className="p-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-3">Query</th>
                  <th className="py-2 pr-3">Clicks</th>
                  <th className="py-2 pr-3">Impr.</th>
                  <th className="py-2 pr-3">CTR</th>
                  <th className="py-2 pr-3">Pos</th>
                </tr>
              </thead>
              <tbody>
                {gscTopQueries.map((q, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-2 pr-3">{q.query}</td>
                    <td className="py-2 pr-3">{safe(q.clicks)}</td>
                    <td className="py-2 pr-3">{safe(q.impressions)}</td>
                    <td className="py-2 pr-3">
                      {Number.isFinite(q.ctr) ? `${(q.ctr * 100).toFixed(1)}%` : "-"}
                    </td>
                    <td className="py-2 pr-3">{Number.isFinite(q.position) ? q.position.toFixed(1) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
