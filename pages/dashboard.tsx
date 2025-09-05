// pages/dashboard.tsx
import { useEffect, useMemo } from "react";
import useSWR from "swr";
import { useAppState } from "../components/state/AppStateProvider";
import Kpi from "../components/Kpi";
import TimeSeries from "../components/charts/TimeSeries";
import { postJSON, lastNDays } from "../lib/http";

export default function Dashboard() {
  const { state, setState } = useAppState();

  // Date window
  const days = state.datePreset === "last28d" ? 28 : 90;
  const { startDate, endDate } = lastNDays(days);

  // --- GSC Top queries (for quick KPIs) ---
  const gscKey = state.gscSiteUrl
    ? ["gsc-top", state.gscSiteUrl, startDate, endDate, state.country || "ALL"]
    : null;

  const { data: gscTop } = useSWR(gscKey, ([, site, s, e, country]) =>
    postJSON("/api/google/gsc/top-queries", {
      siteUrl: site,
      startDate: s,
      endDate: e,
      country,
      rowLimit: 100
    })
  );

  // --- GBP daily metrics (if a location is selected) ---
  const gbpKey = state.gbpLocationName
    ? [
        "gbp-daily",
        state.gbpLocationName,
        startDate,
        endDate,
        "BUSINESS_INTERACTIONS_WEBSITE_CLICKS,BUSINESS_INTERACTIONS_PHONE_CLICKS",
      ]
    : null;

  const { data: gbpDaily } = useSWR(gbpKey, ([, loc, s, e, metrics]) =>
    fetch(
      `/api/google/gbp/daily?location=${encodeURIComponent(
        loc
      )}&startDate=${s}&endDate=${e}&metrics=${encodeURIComponent(metrics)}`
    ).then((r) => r.json())
  );

  // --- quick numbers from GSC ---
  const gscClicks = useMemo(() => {
    const rows = gscTop?.rows || [];
    return rows.reduce((acc: number, r: any) => acc + (r.clicks || 0), 0);
  }, [gscTop]);

  const gscImpr = useMemo(() => {
    const rows = gscTop?.rows || [];
    return rows.reduce((acc: number, r: any) => acc + (r.impressions || 0), 0);
  }, [gscTop]);

  // GBP chart points (make this tolerant to shape differences)
  const gbpSeries = useMemo(() => {
    if (!gbpDaily?.timeSeries || !gbpDaily.timeSeries.length) return [];
    const toX = (d: any) => {
      const s = `${d.date.year}-${String(d.date.month).padStart(2, "0")}-${String(d.date.day).padStart(2, "0")}`;
      return new Date(s).getTime();
    };
    return gbpDaily.timeSeries.map((t: any) => ({
      name: t.dimensions?.[0]?.metric || "metric",
      points: (t.timeSeries || t.dailyMetrics || t.points || []).map((p: any) => ({
        x: toX(p),
        y: p.value ?? p.values?.[0]?.value ?? 0
      }))
    }));
  }, [gbpDaily]);

  useEffect(() => {
    if (!state.country) setState({ country: "ALL" });
  }, [state.country, setState]);

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <select
            className="border rounded px-3 py-1"
            value={state.datePreset}
            onChange={(e) => setState({ datePreset: e.target.value as any })}
          >
            <option value="last28d">Last 28 days</option>
            <option value="last90d">Last 90 days</option>
          </select>
          <select
            className="border rounded px-3 py-1"
            value={state.country || "ALL"}
            onChange={(e) => setState({ country: e.target.value })}
          >
            <option value="ALL">All countries</option>
            <option value="USA">USA</option>
            <option value="IND">India</option>
            <option value="GBR">UK</option>
            <option value="AUS">Australia</option>
          </select>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="GSC Clicks" value={gscClicks || 0} />
        <Kpi label="GSC Impressions" value={gscImpr || 0} />
        <Kpi label="GBP Website Clicks" value={gbpSeries[0]?.points?.reduce((a: number, p: any) => a + p.y, 0) || 0} />
        <Kpi label="GBP Phone Clicks" value={gbpSeries[1]?.points?.reduce((a: number, p: any) => a + p.y, 0) || 0} />
      </div>

      {/* GBP Trend (if selected) */}
      {state.gbpLocationName ? (
        <section className="border rounded p-4">
          <div className="font-semibold mb-2">
            GBP Daily (Website & Phone) — {state.gbpLocationName}
          </div>
          {gbpSeries.length ? (
            <TimeSeries series={gbpSeries} height={220} />
          ) : (
            <div className="text-sm text-gray-500">No GBP data for the selected window.</div>
          )}
        </section>
      ) : (
        <section className="border rounded p-4 text-sm text-gray-500">
          Select a GBP location in <span className="font-medium">Connections</span> to see GBP trends here.
        </section>
      )}
    </main>
  );
}
