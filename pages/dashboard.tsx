// pages/dashboard.tsx
import { useState } from "react";

export default function Dashboard() {
  const [propertyId, setPropertyId] = useState<string>("");
  const [siteUrl, setSiteUrl] = useState<string>("");
  const [start, setStart] = useState<string>(() => new Date(Date.now() - 27*24*60*60*1000).toISOString().slice(0,10));
  const [end, setEnd] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [ga, setGa] = useState<any[]>([]);
  const [gsc, setGsc] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  async function run() {
    setErr("");
    setLoading(true);
    try {
      const params = new URLSearchParams({ startDate: start, endDate: end });
      if (propertyId) params.set("propertyId", propertyId);
      if (siteUrl) params.set("siteUrl", siteUrl);

      const r = await fetch(`/api/aggregations/default?${params.toString()}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed");
      setGa(Array.isArray(j?.ga) ? j.ga : []);
      setGsc(Array.isArray(j?.gsc) ? j.gsc : []);
    } catch (e: any) {
      setErr(e?.message || "Unexpected error");
      setGa([]);
      setGsc([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold mb-4">Default Dashboard</h1>

      <div className="flex flex-wrap gap-3 items-center mb-4">
        <input
          placeholder="GA4 property ID (optional)"
          className="border rounded px-3 py-2"
          value={propertyId}
          onChange={e => setPropertyId(e.target.value)}
        />
        <input
          placeholder="GSC siteUrl (optional)"
          className="border rounded px-3 py-2"
          value={siteUrl}
          onChange={e => setSiteUrl(e.target.value)}
        />
        <input
          type="date"
          className="border rounded px-3 py-2"
          value={start}
          onChange={e => setStart(e.target.value)}
        />
        <input
          type="date"
          className="border rounded px-3 py-2"
          value={end}
          onChange={e => setEnd(e.target.value)}
        />
        <button
          onClick={run}
          disabled={loading}
          className="bg-purple-600 text-white rounded px-4 py-2 disabled:opacity-50"
        >
          {loading ? "Running..." : "Run"}
        </button>
      </div>

      {err ? <p className="text-red-600 mb-3">{err}</p> : null}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="border rounded p-4">
          <h2 className="font-medium mb-2">GA4 Sessions (by day)</h2>
          {ga.length === 0 ? <div className="text-sm text-gray-500">No GA data</div> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left py-1">Date</th>
                  <th className="text-right py-1">Sessions</th>
                </tr>
              </thead>
              <tbody>
                {ga.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-1">{r.date}</td>
                    <td className="py-1 text-right">{r.sessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border rounded p-4">
          <h2 className="font-medium mb-2">GSC Clicks (by day)</h2>
          {gsc.length === 0 ? <div className="text-sm text-gray-500">No GSC data</div> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left py-1">Date</th>
                  <th className="text-right py-1">Clicks</th>
                  <th className="text-right py-1">Impr.</th>
                  <th className="text-right py-1">CTR</th>
                  <th className="text-right py-1">Pos</th>
                </tr>
              </thead>
              <tbody>
                {gsc.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-1">{r.date}</td>
                    <td className="py-1 text-right">{r.clicks}</td>
                    <td className="py-1 text-right">{r.impressions}</td>
                    <td className="py-1 text-right">{(r.ctr * 100).toFixed(2)}%</td>
                    <td className="py-1 text-right">{r.position.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
