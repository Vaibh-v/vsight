import { useEffect, useMemo, useState } from "react";

type GaProperty = { property: string; displayName: string };
type GscSite = { siteUrl: string; permissionLevel?: string };

type GaPoint = { date: string; sessions: number };
type GscPoint = { date: string; clicks: number; impressions: number; ctr: number; position: number };

export default function Dashboard() {
  const [gaProps, setGaProps] = useState<GaProperty[]>([]);
  const [gscSites, setGscSites] = useState<GscSite[]>([]);
  const [propertyId, setPropertyId] = useState<string>("");
  const [siteUrl, setSiteUrl] = useState<string>("");

  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date(Date.now() - 27 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [gaRows, setGaRows] = useState<GaPoint[]>([]);
  const [gscRows, setGscRows] = useState<GscPoint[]>([]);

  // Fetch lists for dropdowns
  useEffect(() => {
    (async () => {
      try {
        const [gaRes, gscRes] = await Promise.all([
          fetch("/api/ga/properties"),
          fetch("/api/gsc/sites"),
        ]);
        if (!gaRes.ok) throw new Error(`GA properties: ${await gaRes.text()}`);
        if (!gscRes.ok) throw new Error(`GSC sites: ${await gscRes.text()}`);

        const gaJson = await gaRes.json();   // { properties: [...] }
        const gscJson = await gscRes.json(); // { sites: [...] }

        const props: GaProperty[] = Array.isArray(gaJson?.properties) ? gaJson.properties : [];
        const sites: GscSite[] = Array.isArray(gscJson?.sites) ? gscJson.sites : [];

        setGaProps(props);
        setGscSites(sites);

        // Preselect first items if any
        if (props.length && !propertyId) setPropertyId(props[0].property.replace("properties/", ""));
        if (sites.length && !siteUrl) setSiteUrl(sites[0].siteUrl);
      } catch (e: any) {
        setError(e?.message || "Failed to load lists.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canRun = useMemo(() => {
    // We allow GA-only or GSC-only or both
    return !!(propertyId || siteUrl) && !!startDate && !!endDate;
  }, [propertyId, siteUrl, startDate, endDate]);

  async function run() {
    if (!canRun) return;
    setLoading(true);
    setError("");
    setGaRows([]);
    setGscRows([]);
    try {
      const params = new URLSearchParams();
      if (propertyId) params.set("propertyId", propertyId);
      if (siteUrl) params.set("siteUrl", siteUrl); // keep EXACT value (sc-domain:… or https://…)
      params.set("startDate", startDate);
      params.set("endDate", endDate);

      const res = await fetch(`/api/aggregations/default?${params.toString()}`);
      const j = await res.json();
      if (!res.ok) {
        throw new Error(j?.error || "Request failed");
      }
      const ga: GaPoint[] = Array.isArray(j?.ga) ? j.ga : [];
      const gsc: GscPoint[] = Array.isArray(j?.gsc) ? j.gsc : (Array.isArray(j?.gsc?.rows) ? j.gsc.rows : []);
      setGaRows(ga);
      setGscRows(gsc);

      // Keep a little state for AI Insight page (optional)
      try {
        localStorage.setItem("vsight_last_dashboard", JSON.stringify({
          propertyId, siteUrl, startDate, endDate, gaCount: ga.length, gscCount: gsc.length
        }));
      } catch {}
    } catch (e: any) {
      setError(e?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Default Dashboard</h1>

      <div className="flex flex-wrap items-center gap-3">
        <select
          className="border rounded px-2 py-1 min-w-[260px]"
          value={propertyId}
          onChange={e => setPropertyId(e.target.value)}
        >
          <option value="">— GA4 (optional) —</option>
          {gaProps.map(p => {
            const id = p.property.replace("properties/", "");
            return (
              <option key={p.property} value={id}>
                {p.displayName} ({id})
              </option>
            );
          })}
        </select>

        <select
          className="border rounded px-2 py-1 min-w-[260px]"
          value={siteUrl}
          onChange={e => setSiteUrl(e.target.value)}
        >
          <option value="">— GSC (optional) —</option>
          {gscSites.map(s => (
            <option key={s.siteUrl} value={s.siteUrl}>
              {s.siteUrl}
            </option>
          ))}
        </select>

        <input
          type="date"
          className="border rounded px-2 py-1"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
        />
        <input
          type="date"
          className="border rounded px-2 py-1"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
        />

        <button
          onClick={run}
          disabled={!canRun || loading}
          className="bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Running…" : "Run"}
        </button>
      </div>

      {error && (
        <pre className="text-sm text-red-600 whitespace-pre-wrap">{error}</pre>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-4">
          <h2 className="font-medium mb-2">GA4 Sessions (by day)</h2>
          {gaRows.length === 0 ? (
            <div className="text-sm text-gray-500">No GA data</div>
          ) : (
            <ul className="text-sm space-y-1">
              {gaRows.map(r => (
                <li key={r.date} className="flex justify-between">
                  <span>{r.date}</span>
                  <span>{r.sessions}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border rounded p-4">
          <h2 className="font-medium mb-2">GSC Clicks (by day)</h2>
          {gscRows.length === 0 ? (
            <div className="text-sm text-gray-500">No GSC data</div>
          ) : (
            <ul className="text-sm space-y-1">
              {gscRows.map(r => (
                <li key={r.date} className="grid grid-cols-5 gap-2">
                  <span>{r.date}</span>
                  <span className="text-right">{r.clicks}</span>
                  <span className="text-right">{r.impressions}</span>
                  <span className="text-right">{(r.ctr * 100).toFixed(2)}%</span>
                  <span className="text-right">{r.position.toFixed(1)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Tip: If you see a 403 from GSC, switch the siteUrl to an entry that starts with
        <code className="mx-1">sc-domain:</code> or the exact verified <code>https://</code> URL you have access to.
      </p>
    </div>
  );
}
