import { useSession } from "next-auth/react";
import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/components/state/AppStateProvider";
import { TrafficChart } from "@/components/Charts";

const PRESETS = [
  { label: "Last 28 days", days: 28 },
  { label: "Last 90 days", days: 90 },
];

function lastNDays(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

export default function Dashboard() {
  const { status } = useSession();
  const { ga4PropertyId, gscSiteUrl, dateRange, setSelections } = useAppState();
  useEffect(() => {
    if (!dateRange) {
      const r = lastNDays(28);
      setSelections({ dateRange: { start: r.start, end: r.end } });
    }
  }, [dateRange, setSelections]);

  const start = dateRange?.start;
  const end = dateRange?.end;

  const { data: gaProps } = useSWR(status === "authenticated" ? "/api/google/ga/properties" : null);
  const { data: gscSites } = useSWR(status === "authenticated" ? "/api/gsc/sites" : null);

  const { data: gaSeries } = useSWR(
    status === "authenticated" && ga4PropertyId && start && end
      ? `/api/ga/sessions?propertyId=${ga4PropertyId}&start=${start}&end=${end}`
      : null
  );

  const { data: gscSeries } = useSWR(
    status === "authenticated" && gscSiteUrl && start && end
      ? `/api/gsc/timeseries?siteUrl=${encodeURIComponent(gscSiteUrl)}&start=${start}&end=${end}`
      : null
  );

  const merged = useMemo(() => {
    const map = new Map<string, any>();
    (gaSeries?.rows || []).forEach((r: any) => {
      map.set(r.date, { date: r.date, sessions: r.sessions ?? 0 });
    });
    (gscSeries?.data || []).forEach((r: any) => {
      const row = map.get(r.date) || { date: r.date };
      row.clicks = r.clicks ?? 0;
      row.ctr = Number(((r.ctr ?? 0) * 100).toFixed(2));
      map.set(r.date, row);
    });
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [gaSeries, gscSeries]);

  const [insight, setInsight] = useState("");
  useEffect(() => {
    (async () => {
      if (!merged.length) { setInsight(""); return; }
      const r = await fetch("/api/insights/summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: merged }) });
      const j = await r.json();
      setInsight(j.summary || "");
    })();
  }, [JSON.stringify(merged)]);

  if (status !== "authenticated") {
    return <main className="max-w-5xl mx-auto p-6">Please sign in on the Connections page.</main>;
  }

  const gaOptions = (gaProps?.properties || []) as Array<{ id: string; displayName: string }>;
  const gscOptions = (gscSites?.sites || []) as Array<{ siteUrl: string }>;

  const handlePreset = (days: number) => {
    const r = lastNDays(days);
    setSelections({ dateRange: { start: r.start, end: r.end } });
  };

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Default Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm text-gray-600">GA4 Property</label>
          <select
            className="mt-1 w-full border rounded px-3 py-2"
            value={ga4PropertyId || ""}
            onChange={(e) => setSelections({ ga4PropertyId: e.target.value })}
          >
            <option value="">Select GA4 property…</option>
            {gaOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.displayName} (#{p.id})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-600">GSC Site</label>
          <select
            className="mt-1 w-full border rounded px-3 py-2"
            value={gscSiteUrl || ""}
            onChange={(e) => setSelections({ gscSiteUrl: e.target.value })}
          >
            <option value="">Select GSC site…</option>
            {gscOptions.map((s) => (
              <option key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-600">Date range</label>
          <div className="mt-1 flex gap-2">
            {PRESETS.map((p) => (
              <button key={p.days} onClick={() => handlePreset(p.days)} className="px-3 py-2 rounded border">
                {p.label}
              </button>
            ))}
          </div>
          {start && end && <p className="text-xs text-gray-500 mt-1">{start} → {end}</p>}
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="font-medium mb-2">Sessions, Clicks & CTR</h2>
        <TrafficChart data={merged} />
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="font-medium mb-2">AI Insight</h2>
        <div className="prose text-sm whitespace-pre-wrap">{insight || "Select a GA4 property and GSC site to see insights."}</div>
      </div>
    </main>
  );
}
