// pages/dashboard.tsx
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/components/state/AppStateProvider";

const PRESETS = [
  { label: "Last 28 days", days: 28 },
  { label: "Last 90 days", days: 90 },
];

function lastNDays(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
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
  const { data: gscSites } = useSWR(status === "authenticated" ? "/api/google/gsc/sites" : null);

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

  // merge by date
  const merged = useMemo(() => {
    const map = new Map<string, any>();

    (gaSeries?.rows || gaSeries?.data || []).forEach((r: any) => {
      map.set(r.date, { date: r.date, sessions: r.sessions ?? 0 });
    });

    (gscSeries?.data || []).forEach((r: any) => {
      const row: any = map.get(r.date) || { date: r.date };
      row.clicks = r.clicks ?? 0;

      // ✅ FIX: don’t test for .toFixed; just compute safely
      const ctr = Number(((r.ctr ?? 0) * 100).toFixed(2)); // percent with 2 decimals
      row.ctr = isNaN(ctr) ? 0 : ctr;

      map.set(r.date, row);
    });

    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [gaSeries, gscSeries]);

  if (status !== "authenticated") {
    return (
      <main className="max-w-6xl mx-auto p-6">
        Please sign in on the <a className="underline" href="/connections">Connections</a> page.
      </main>
    );
  }

  const gaOptions = (gaProps?.properties || []).map((p: any) => p);
  const gscOptions = (gscSites?.sites || []).map((s: any) => s);

  const handlePreset = (days: number) => {
    const r = lastNDays(days);
    setSelections({ dateRange: { start: r.start, end: r.end } });
  };

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Default Dashboard</h1>

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm text-gray-600">GA4 Property</label>
          <select
            className="mt-1 w-full border rounded px-3 py-2"
            value={ga4PropertyId || ""}
            onChange={(e) => setSelections({ ga4PropertyId: e.target.value })}
          >
            <option value="">Select GA4 property…</option>
            {gaOptions.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.displayName} (#{p.id})
              </option>
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
            {gscOptions.map((s: any) => (
              <option key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-600">Date range</label>
          <div className="mt-1 flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.days}
                onClick={() => handlePreset(p.days)}
                className="px-3 py-2 rounded border"
              >
                {p.label}
              </button>
            ))}
          </div>
          {start && end && (
            <p className="text-xs text-gray-500 mt-1">
              {start} → {end}
            </p>
          )}
        </div>
      </div>

      {/* Data preview (swap with your chart) */}
      <div className="border rounded-lg p-4">
        <h2 className="font-medium mb-2">Sessions, Clicks & CTR</h2>
        <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">
{JSON.stringify(merged.slice(-10), null, 2)}
        </pre>
      </div>
    </main>
  );
}
