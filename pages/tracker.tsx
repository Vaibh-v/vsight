// pages/tracker.tsx
"use client";

import React from "react";
import { useSession, signIn } from "next-auth/react";
import GSCSitePicker from "@/components/GSCSitePicker";
import CountrySelect from "@/components/CountrySelect";
import { LineChartModern, BarChartModern } from "@/components/ChartKit";

type Row = { query: string; clicks: number; impressions: number; ctr: number; position: number };

export default function Tracker() {
  const { status } = useSession();
  const [siteUrl, setSiteUrl] = React.useState<string | undefined>(undefined);
  const [country, setCountry] = React.useState<string | undefined>(undefined);
  const [device, setDevice] = React.useState<string>("ALL");
  const [start, setStart] = React.useState<string>(() => new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10));
  const [end, setEnd] = React.useState<string>(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [seriesLabels, setSeriesLabels] = React.useState<string[]>([]);
  const [clicksSeries, setClicksSeries] = React.useState<number[]>([]);
  const [imprSeries, setImprSeries] = React.useState<number[]>([]);
  const [rows, setRows] = React.useState<Row[]>([]);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!siteUrl) throw new Error("Select a GSC site");

      // Timeseries
      const qs1 = new URLSearchParams({ siteUrl, start, end });
      if (country) qs1.set("country", country);
      if (device && device !== "ALL") qs1.set("device", device);

      const tRes = await fetch(`/api/gsc/timeseries?${qs1.toString()}`);
      const tData = await tRes.json();
      if (!tRes.ok) throw new Error(tData?.error || "Failed to fetch timeseries");

      setSeriesLabels((tData?.rows ?? []).map((r: any) => r.date));
      setClicksSeries((tData?.rows ?? []).map((r: any) => r.clicks ?? 0));
      setImprSeries((tData?.rows ?? []).map((r: any) => r.impressions ?? 0));

      // Top queries
      const qs2 = new URLSearchParams({ siteUrl, start, end, rowLimit: "25", sortBy: "clicks", sortDir: "desc" });
      if (country) qs2.set("country", country);
      if (device && device !== "ALL") qs2.set("device", device);

      const qRes = await fetch(`/api/gsc/top-queries?${qs2.toString()}`);
      const qData = await qRes.json();
      if (!qRes.ok) throw new Error(qData?.error || "Failed to fetch top queries");

      setRows(qData?.rows ?? []);
    } catch (e: any) {
      setError(e?.message || "Run failed");
    } finally {
      setLoading(false);
    }
  };

  if (status === "unauthenticated") {
    return (
      <div className="p-6">
        <button className="border px-4 py-2 rounded" onClick={() => signIn()}>Sign in</button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Organic Tracker</h1>

      <div className="grid md:grid-cols-6 gap-3">
        <div className="md:col-span-2">
          <label className="text-sm block mb-1">GSC Site</label>
          <GSCSitePicker value={siteUrl} onChange={setSiteUrl} />
        </div>
        <div>
          <label className="text-sm block mb-1">Country</label>
          <CountrySelect value={country} onChange={setCountry} />
        </div>
        <div>
          <label className="text-sm block mb-1">Device</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={device}
            onChange={(e) => setDevice(e.target.value)}
          >
            <option value="ALL">All</option>
            <option value="DESKTOP">Desktop</option>
            <option value="MOBILE">Mobile</option>
            <option value="TABLET">Tablet</option>
          </select>
        </div>
        <div>
          <label className="text-sm block mb-1">Start</label>
          <input type="date" className="w-full border rounded px-3 py-2" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="text-sm block mb-1">End</label>
          <input type="date" className="w-full border rounded px-3 py-2" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div className="flex items-end">
          <button className="border px-4 py-2 rounded w-full" onClick={run} disabled={loading}>
            {loading ? "Running..." : "Run"}
          </button>
        </div>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      {/* Graphs */}
      {seriesLabels.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border rounded p-3">
            <div className="font-medium mb-2">Clicks (daily)</div>
            <LineChartModern labels={seriesLabels} series={[{ label: "Clicks", data: clicksSeries }]} />
          </div>
          <div className="border rounded p-3">
            <div className="font-medium mb-2">Impressions (daily)</div>
            <LineChartModern labels={seriesLabels} series={[{ label: "Impressions", data: imprSeries }]} />
          </div>
        </div>
      )}

      {/* Table */}
      {rows.length > 0 && (
        <div className="border rounded overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-2">Query</th>
                <th className="p-2">Clicks</th>
                <th className="p-2">Impressions</th>
                <th className="p-2">CTR</th>
                <th className="p-2">Position</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{r.query}</td>
                  <td className="p-2">{r.clicks}</td>
                  <td className="p-2">{r.impressions}</td>
                  <td className="p-2">{(r.ctr * 100).toFixed(2)}%</td>
                  <td className="p-2">{r.position.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Top queries bar (clicks) */}
      {rows.length > 0 && (
        <div className="border rounded p-3">
          <div className="font-medium mb-2">Top Queries by Clicks</div>
          <BarChartModern
            labels={rows.map((r) => r.query)}
            series={[{ label: "Clicks", data: rows.map((r) => r.clicks) }]}
            height={360}
          />
        </div>
      )}
    </div>
  );
}
