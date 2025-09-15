import React, { useEffect, useMemo, useState } from "react";

type GaRow = { date: string; sessions: number };
type GscRow = { date: string; clicks: number; impressions: number; ctr: number; position: number };

type GaProperty = { property: string; displayName?: string };
type GscSite = { siteUrl: string; permissionLevel?: string };

type AggregationsResponse =
  | { ga: GaRow[]; gsc: GscRow[] }
  | { error: string };

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) {
    let msg = `${r.status} ${r.statusText}`;
    try {
      const j = await r.json();
      msg = (j && (j.error || j.message)) || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return r.json();
}

export default function DashboardPage() {
  const [gaProps, setGaProps] = useState<GaProperty[]>([]);
  const [gscSites, setGscSites] = useState<GscSite[]>([]);

  const [propertyId, setPropertyId] = useState<string>("");
  const [siteUrl, setSiteUrl] = useState<string>("");

  // Default to last 28 days
  const today = useMemo(() => new Date(), []);
  const [endDate, setEndDate] = useState<string>(toISO(today));
  const [startDate, setStartDate] = useState<string>(
    toISO(new Date(today.getTime() - 27 * 24 * 60 * 60 * 1000))
  );

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [ga, setGa] = useState<GaRow[]>([]);
  const [gsc, setGsc] = useState<GscRow[]>([]);

  // Load picklists (defensive: tolerate either shape the APIs might return)
  useEffect(() => {
    (async () => {
      try {
        // GA4 properties
        try {
          const j: any = await fetchJson<any>("/api/ga/properties");
          const rows: GaProperty[] = Array.isArray(j?.properties) ? j.properties : Array.isArray(j) ? j : [];
          setGaProps(rows);
          if (!propertyId && rows.length > 0) setPropertyId(rows[0].property);
        } catch (e: any) {
          // It's okay if user didn't connect GA; keep empty list
          console.warn("GA properties load warning:", e?.message || e);
        }

        // GSC sites
        try {
          const j: any = await fetchJson<any>("/api/gsc/sites");
          const rows: GscSite[] = Array.isArray(j?.sites) ? j.sites : Array.isArray(j) ? j : [];
          setGscSites(rows);
          if (!siteUrl && rows.length > 0) setSiteUrl(rows[0].siteUrl);
        } catch (e: any) {
          console.warn("GSC sites load warning:", e?.message || e);
        }
      } catch (e) {
        // swallow
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run() {
    setErr("");
    setLoading(true);
    setGa([]);
    setGsc([]);
    try {
      const qs = new URLSearchParams({
        ...(propertyId ? { propertyId } : {}),
        ...(siteUrl ? { siteUrl } : {}),
        startDate,
        endDate,
      }).toString();

      const j = await fetchJson<AggregationsResponse>(`/api/aggregations/default?${qs}`);

      if ("error" in j) {
        setErr(j.error || "Unknown error");
        setGa([]);
        setGsc([]);
        return;
      }

      setGa(Array.isArray(j.ga) ? j.ga : []);
      setGsc(Array.isArray(j.gsc) ? j.gsc : []);
    } catch (e: any) {
      setErr(String(e?.message || e || "Unexpected error"));
    } finally {
      setLoading(false);
    }
  }

  // small helpers for UI
  function formatNum(n: number | undefined) {
    return (n ?? 0).toLocaleString();
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Default Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">GA4 Property (optional)</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
          >
            <option value="">— Not using GA4 —</option>
            {gaProps.map((p) => (
              <option key={p.property} value={p.property}>
                {p.displayName ? `${p.displayName} (${p.property})` : p.property}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">GSC Site (optional)</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
          >
            <option value="">— Not using GSC —</option>
            {gscSites.map((s) => (
              <option key={s.siteUrl} value={s.siteUrl}>
                {s.siteUrl}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3 md:col-span-1">
          <div>
            <label className="block text-sm font-medium mb-1">Start</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="md:col-span-5">
          <button
            onClick={run}
            className="mt-3 inline-flex items-center px-4 py-2 rounded bg-purple-600 text-white disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Running…" : "Run"}
          </button>
        </div>
      </div>

      {err && (
        <div className="mt-4 text-red-600 whitespace-pre-wrap break-words">
          {err}
        </div>
      )}

      {/* GA Panel */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <h2 className="font-medium mb-2">GA4 Sessions (by day)</h2>
          {ga.length === 0 ? (
            <div className="text-sm text-gray-500">No GA data</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-1 pr-2">Date</th>
                  <th className="py-1">Sessions</th>
                </tr>
              </thead>
              <tbody>
                {ga.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-1 pr-2">{r.date}</td>
                    <td className="py-1">{formatNum(r.sessions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* GSC Panel */}
        <div className="border rounded-lg p-4">
          <h2 className="font-medium mb-2">GSC Clicks (by day)</h2>
          {gsc.length === 0 ? (
            <div className="text-sm text-gray-500">No GSC data</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-1 pr-2">Date</th>
                  <th className="py-1 pr-2">Clicks</th>
                  <th className="py-1 pr-2">Impr.</th>
                  <th className="py-1 pr-2">CTR</th>
                  <th className="py-1">Avg Pos</th>
                </tr>
              </thead>
              <tbody>
                {gsc.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-1 pr-2">{r.date}</td>
                    <td className="py-1 pr-2">{formatNum(r.clicks)}</td>
                    <td className="py-1 pr-2">{formatNum(r.impressions)}</td>
                    <td className="py-1 pr-2">{(r.ctr ?? 0).toFixed(2)}%</td>
                    <td className="py-1">{(r.position ?? 0).toFixed(1)}</td>
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
