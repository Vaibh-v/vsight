import { useMemo } from "react";
import useSWR from "swr";
import { useAppState } from "../components/state/AppStateProvider";
import { lastNDays, postJSON } from "../lib/http";

export default function Tracker() {
  const { state, setState } = useAppState();
  const days = state.datePreset === "last28d" ? 28 : 90;
  const { startDate, endDate } = lastNDays(days);

  // --- GSC top queries (global or filtered by country) ---
  const gscKey = state.gscSiteUrl
    ? ["gsc-top", state.gscSiteUrl, startDate, endDate, state.country]
    : null;

  const { data: gscTop } = useSWR(gscKey, ([, site, s, e, country]) =>
    postJSON("/api/google/gsc/top-queries", {
      siteUrl: site,
      startDate: s,
      endDate: e,
      country,
      rowLimit: 250
    })
  );

  const top10 = useMemo(() => {
    const rows: any[] = gscTop?.rows || [];
    // keep SERP Top-10 (avg position <= 10), sort by impressions desc
    const filtered = rows.filter((r) => (r.position ?? 999) <= 10);
    filtered.sort((a, b) => (b.impressions || 0) - (a.impressions || 0));
    return filtered.slice(0, 10);
  }, [gscTop]);

  // --- GBP monthly keywords (last 3 months) ---
  const gbpKey = state.gbpLocation
    ? ["gbp-monthly", state.gbpLocation.name]
    : null;

  const today = new Date();
  const endMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const d2 = new Date(today);
  d2.setMonth(today.getMonth() - 2);
  const startMonth = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, "0")}`;

  const { data: gbpKw } = useSWR(
    gbpKey
      ? `/api/google/gbp/keywords-monthly?location=${encodeURIComponent(
          state.gbpLocation!.name
        )}&startMonth=${startMonth}&endMonth=${endMonth}`
      : null
  );

  const flatKeywords = useMemo(() => {
    if (!gbpKw?.searchKeywords) return [];
    // API returns list of { searchKeyword: { text }, monthlyImpressions: [{ month, impressions }] }
    const out: { keyword: string; impressions: number }[] = [];
    for (const row of gbpKw.searchKeywords) {
      const kw = row.searchKeyword?.text || "";
      const sum = (row.monthlyImpressions || []).reduce((a: number, m: any) => a + (m.impressions || 0), 0);
      out.push({ keyword: kw, impressions: sum });
    }
    out.sort((a, b) => b.impressions - a.impressions);
    return out.slice(0, 20);
  }, [gbpKw]);

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Organic Tracker</h1>
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

      {/* Top-10 SERP queries */}
      <section className="border rounded p-4">
        <div className="font-semibold mb-2">Top-10 Keywords (SERP ≤ 10) — {state.gscSiteUrl || "No site selected"}</div>
        {!state.gscSiteUrl ? (
          <div className="text-sm text-gray-500">Pick a GSC property on the Connections page.</div>
        ) : top10.length ? (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Query</th>
                  <th className="py-2 pr-4">Clicks</th>
                  <th className="py-2 pr-4">Impr.</th>
                  <th className="py-2 pr-4">CTR</th>
                  <th className="py-2 pr-4">Pos.</th>
                </tr>
              </thead>
              <tbody>
                {top10.map((r) => (
                  <tr key={r.keys?.[0]} className="border-b last:border-0">
                    <td className="py-2 pr-4">{r.keys?.[0]}</td>
                    <td className="py-2 pr-4">{r.clicks ?? 0}</td>
                    <td className="py-2 pr-4">{r.impressions ?? 0}</td>
                    <td className="py-2 pr-4">{(r.ctr ?? 0).toFixed(3)}</td>
                    <td className="py-2 pr-4">{(r.position ?? 0).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-gray-500">No Top-10 keywords for this window.</div>
        )}
      </section>

      {/* GBP keywords */}
      <section className="border rounded p-4">
        <div className="font-semibold mb-2">GBP Keywords (last 3 months)</div>
        {!state.gbpLocation ? (
          <div className="text-sm text-gray-500">Select a GBP location in Connections to see this.</div>
        ) : flatKeywords.length ? (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Keyword</th>
                  <th className="py-2 pr-4">Impressions</th>
                </tr>
              </thead>
              <tbody>
                {flatKeywords.map((k) => (
                  <tr key={k.keyword} className="border-b last:border-0">
                    <td className="py-2 pr-4">{k.keyword}</td>
                    <td className="py-2 pr-4">{k.impressions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-gray-500">No GBP keyword data.</div>
        )}
      </section>
    </main>
  );
}
