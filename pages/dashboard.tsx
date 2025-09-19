// pages/dashboard.tsx
"use client";

import React from "react";
import { useSession, signIn } from "next-auth/react";
import GA4PropertyPicker from "@/components/GA4PropertyPicker";
import GSCSitePicker from "@/components/GSCSitePicker";
import { LineChartModern } from "@/components/ChartKit";

export default function Dashboard() {
  const { status } = useSession();
  const [propertyId, setPropertyId] = React.useState<string | undefined>(undefined);
  const [siteUrl, setSiteUrl] = React.useState<string | undefined>(undefined);
  const [start, setStart] = React.useState<string>(() => new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10));
  const [end, setEnd] = React.useState<string>(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [gaLabels, setGaLabels] = React.useState<string[]>([]);
  const [gaSessions, setGaSessions] = React.useState<number[]>([]);
  const [gaActive, setGaActive] = React.useState<number[]>([]);

  const [gscLabels, setGscLabels] = React.useState<string[]>([]);
  const [gscClicks, setGscClicks] = React.useState<number[]>([]);
  const [gscImpr, setGscImpr] = React.useState<number[]>([]);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ start, end });
      if (propertyId) qs.set("propertyId", propertyId);
      if (siteUrl) qs.set("siteUrl", siteUrl);

      const r = await fetch(`/api/aggregations/default?${qs.toString()}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Failed");

      const ga = Array.isArray(data?.ga) ? data.ga : [];
      const gsc = Array.isArray(data?.gsc) ? data.gsc : [];

      setGaLabels(ga.map((x: any) => x.date));
      setGaSessions(ga.map((x: any) => x.sessions ?? 0));
      setGaActive(ga.map((x: any) => x.activeUsers ?? 0));

      setGscLabels(gsc.map((x: any) => x.date));
      setGscClicks(gsc.map((x: any) => x.clicks ?? 0));
      setGscImpr(gsc.map((x: any) => x.impressions ?? 0));
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
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className="text-sm block mb-1">GA4 Property (optional)</label>
          <GA4PropertyPicker value={propertyId} onChange={setPropertyId} />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm block mb-1">GSC Site (optional)</label>
          <GSCSitePicker value={siteUrl} onChange={setSiteUrl} />
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
          <button onClick={run} disabled={loading} className="border px-4 py-2 rounded w-full">
            {loading ? "Running..." : "Run"}
          </button>
        </div>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      {/* GA4 */}
      {gaLabels.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border rounded p-3">
            <div className="font-medium mb-2">GA4 Sessions</div>
            <LineChartModern labels={gaLabels} series={[{ label: "Sessions", data: gaSessions }]} />
          </div>
          <div className="border rounded p-3">
            <div className="font-medium mb-2">GA4 Active Users</div>
            <LineChartModern labels={gaLabels} series={[{ label: "Active Users", data: gaActive }]} />
          </div>
        </div>
      )}

      {/* GSC */}
      {gscLabels.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border rounded p-3">
            <div className="font-medium mb-2">GSC Clicks</div>
            <LineChartModern labels={gscLabels} series={[{ label: "Clicks", data: gscClicks }]} />
          </div>
          <div className="border rounded p-3">
            <div className="font-medium mb-2">GSC Impressions</div>
            <LineChartModern labels={gscLabels} series={[{ label: "Impressions", data: gscImpr }]} />
          </div>
        </div>
      )}
    </div>
  );
}
