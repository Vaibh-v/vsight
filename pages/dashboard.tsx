// pages/dashboard.tsx
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "../components/state/AppStateProvider";
import { iso, lastNDays } from "../lib/util";
import { TrafficChart } from "../components/Charts";

type GAProp = { id: string; displayName: string };

const PRESETS = [
  { label: "Last 28 days", days: 28 },
  { label: "Last 90 days", days: 90 },
];

export default function Dashboard() {
  const { status } = useSession();
  const { ga4PropertyId, gscSiteUrl, dateRange, setSelections } = useAppState();

  // Initialize default date range on first load
  useEffect(() => {
    if (!dateRange) {
      const r = lastNDays(28);
      setSelections({ dateRange: { start: r.startDate, end: r.endDate } });
    }
  }, [dateRange, setSelections]);

  const start = dateRange?.start;
  const end = dateRange?.end;

  // Data sources
  const { data: gaProps } = useSWR(
    status === "authenticated" ? "/api/ga/properties" : null
  );
  const { data: gscSites } = useSWR(
    status === "authenticated" ? "/api/gsc/sites" : null
  );

  const { data: gaSeries } = useSWR(
    status === "authenticated" && ga4PropertyId && start && end
      ? `/api/ga/sessions?propertyId=${ga4PropertyId}&start=${start}&end=${end}`
      : null
  );

  const { data: gscSeries } = useSWR(
    status === "authenticated" && gscSiteUrl && start && end
      ? `/api/gsc/timeseries?siteUrl=${encodeURIComponent(
          gscSiteUrl
        )}&start=${start}&end=${end}`
      : null
  );

  // Merge GA + GSC by date (defensive to shapes from either API)
  const merged = useMemo(() => {
    const map = new Map<string, any>();

    // GA rows may come as [{date, sessions}] or Analytics Data API style
    (gaSeries?.rows || gaSeries?.data || []).forEach((r: any) => {
      const date: string =
        r.date ?? r.dimensionValues?.[0]?.value ?? r.day ?? r.dateString;
      const sessionsNum =
        r.sessions ?? Number(r.metricValues?.[0]?.value ?? 0) ?? 0;
      if (!date) return;
      const row = map.get(date) || { date };
      row.sessions = Number(sessionsNum || 0);
      map.set(date, row);
    });

    // GSC rows as [{date, clicks, ctr}] or Search Console style
    (gscSeries?.data || gscSeries?.rows || []).forEach((r: any) => {
      const date: string = r.date ?? r.keys?.[0];
      if (!date) return;
      const row = map.get(date) || { date };
      row.clicks = Number(r.clicks ?? 0);

      // r.ctr may be fraction (0–1) or string — normalize to percentage (0–100)
      const ctrRaw =
        typeof r.ctr === "string" ? parseFloat(r.ctr) : Number(r.ctr ?? 0);
      row.ctr = Number((ctrRaw * 100).toFixed(2));

      map.set(date, row);
    });

    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [gaSeries, gscSeries]);

  // Auto insight (optional)
  const [insight, setInsight] = useState<string>("");
  useEffect(() => {
    (async () => {
      if (!merged?.length) {
        setInsight("");
        return;
      }
      const r = await fetch("/api/insights/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: merged }),
      });
      const j = await r.json();
      setInsight(j.summary || "");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(merged)]);

  if (status !== "authenticated") {
    return (
      <main className="max-w-5xl mx-auto p-6">
        Please sign in on the <a className="underline" href="/connections">Connections</a> page.
      </main>
    );
  }

  const handlePreset = (days: number) => {
    const r = lastNDays(days);
    setSelections({ dateRange: { start: r.startDate, end: r.endDate } });
  };

  const gaOptions: GAProp[] = (gaProps?.properties || []).map((p: any) => p);
  const gscOptions = (gscSites?.sites || []).map((s: any) => s);

  const currentRangeLabel =
    start && end ? `${iso(new Date(start))} → ${iso(new Date(end))}` : "";

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Default Dashboard</h1>

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* GA4 */}
        <div>
          <label className="text-sm text-gray-600">GA4 Property</label>
          <select
            className="mt-1 w-full border rounded px-3 py-2"
            value={ga4PropertyId || ""}
            onChange={(e) => setSelections({ ga4PropertyId: e.target.value })}
          >
            <option value="">Select GA4 property…</option>
            {gaOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName} (#{p.id})
              </option>
            ))}
          </select>
        </div>

        {/* GSC */}
        <div>
          <label className="text-sm text-gray-600">GSC Site</label>
          <select
            className="mt-1 w-full border rounded px-3 py-2"
            value={gscSiteUrl || ""}
            onChange={(e) => setSelections({ gscSiteUrl: e.target.value })}
          >
            <option value="">Select GSC site…</option>
            {gscOptions.map((s: any) => (
              <option key={s.siteUrl} value={s.siteUrl}>
                {s.siteUrl}
              </option>
            ))}
          </select>
        </div>

        {/* Date presets */}
        <div>
          <label className="text-sm text-gray-600">Date range</label>
          <div className="mt-1 flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.days}
                onClick={() => handlePreset(p.days)}
                className="px-3 py-2 rounded border hover:bg-gray-50"
              >
                {p.label}
              </button>
            ))}
          </div>
          {currentRangeLabel && (
            <p className="text-xs text-gray-500 mt-1">{currentRangeLabel}</p>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="border rounded-lg p-4">
        <h2 className="font-medium mb-2">Sessions, Clicks & CTR</h2>
        <TrafficChart data={merged} />
      </div>

      {/* AI Insight */}
      <div className="border rounded-lg p-4">
        <h2 className="font-medium mb-2">AI Insight</h2>
        <div className="prose text-sm whitespace-pre-wrap">
          {insight || "Select a GA4 property and GSC site to see insights."}
        </div>
      </div>
    </main>
  );
}
