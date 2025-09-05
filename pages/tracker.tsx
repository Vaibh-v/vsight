import useSWR from "swr";
import { useMemo, useState } from "react";
import DateControls from "../components/DateControls";
import CountryStatePicker from "../components/CountryStatePicker";
import { useAppState } from "../components/state/AppStateProvider";
import { lastNDays, postJSON } from "../lib/http";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function OrganicTracker() {
  const { state } = useAppState();
  const [customKeywords, setCustomKeywords] = useState<string>("");

  // date window
  const { startDate, endDate } = useMemo(() => {
    if (state.datePreset === "custom" && state.startDate && state.endDate) {
      return { startDate: state.startDate, endDate: state.endDate };
    }
    const days = state.datePreset === "last28d" ? 28 : state.datePreset === "last60d" ? 60 : 90;
    return lastNDays(days);
  }, [state.datePreset, state.startDate, state.endDate]);

  // --- Top-10 keywords from GSC ---
  const gscKey = state.gscSiteUrl
    ? ["gsc-top10", state.gscSiteUrl, startDate, endDate, state.country]
    : null;

  const { data: gscTop } = useSWR(gscKey, ([, site, s, e, country]) =>
    postJSON("/api/google/gsc/top-queries", {
      siteUrl: site, startDate: s, endDate: e, country, rowLimit: 500, maxPosition: 10
    })
  );

  // --- GBP keywords (last 3 months) ---
  const gbpKey = state.gbpLocationName ? [ "gbp-kw", state.gbpLocationName ] : null;
  const { data: gbpKw } = useSWR(gbpKey, ([, loc]) =>
    fetch(`/api/google/gbp/keywords?locationName=${encodeURIComponent(loc)}`).then(r => r.json())
  );

  // --- User-entered keywords: SERP rank in selected region ---
  const [serpLoading, setSerpLoading] = useState(false);
  const [serpRows, setSerpRows] = useState<any[]>([]);
  const runSerp = async () => {
    const keywords = customKeywords.split("\n").map(s => s.trim()).filter(Boolean);
    if (!keywords.length) return;
    setSerpLoading(true);
    try {
      const j = await postJSON("/api/serp/rank", { keywords, country: state.country, region: state.region });
      setSerpRows(j.data || []);
    } finally {
      setSerpLoading(false);
    }
  };

  // shape tables
  const top10Rows = (gscTop?.data?.rows || []).map((r: any) => ({
    query: (r.keys?.[0] || r.dimensionValues?.[0]?.value || r.query || "").toString(),
    clicks: r.clicks ?? r.metrics?.[0]?.clicks ?? 0,
    impressions: r.impressions ?? r.metrics?.[0]?.impressions ?? 0,
    position: r.position ?? r.avgPosition ?? r.metrics?.[0]?.position ?? 0,
    ctr: r.ctr ?? r.metrics?.[0]?.ctr ?? 0,
  })).slice(0, 200); // safety

  const gbpKeywords = gbpKw?.data?.searchKeywordsImpressionsMonthly || [];

  return (
    <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Organic Tracker</h1>
          <div className="flex items-center gap-3">
            <DateControls />
            <CountryStatePicker />
          </div>
        </div>

        {/* Top-10 SERP (GSC) */}
        <div className="border rounded-lg">
          <div className="px-4 py-3 border-b font-medium">
            Top-10 Keywords (SERP ≤ 10){!state.gscSiteUrl && " — No site selected"}
          </div>
          {state.gscSiteUrl ? (
            <div className="overflow-x-auto p-4">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-600">
                  <tr>
                    <th className="py-2">Query</th>
                    <th className="py-2">Clicks</th>
                    <th className="py-2">Impressions</th>
                    <th className="py-2">Avg Position</th>
                    <th className="py-2">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {top10Rows.map((r: any, i: number) => (
                    <tr key={i} className="border-t">
                      <td className="py-2 pr-4">{r.query}</td>
                      <td className="py-2">{r.clicks}</td>
                      <td className="py-2">{r.impressions}</td>
                      <td className="py-2">{r.position.toFixed ? r.position.toFixed(1) : r.position}</td>
                      <td className="py-2">{(r.ctr * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                  {!top10Rows.length && (
                    <tr><td className="py-6 text-gray-500" colSpan={5}>No results in the selected window.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 text-sm text-gray-500">Pick a GSC property on the Connections page.</div>
          )}
        </div>

        {/* GBP Keywords (3 months) */}
        <div className="border rounded-lg">
          <div className="px-4 py-3 border-b font-medium">GBP Keywords (last 3 months){!state.gbpLocationName && " — No location selected"}</div>
          {state.gbpLocationName ? (
            <div className="p-4">
              {gbpKeywords.length ? (
                <ul className="list-disc list-inside text-sm">
                  {gbpKeywords.slice(0, 200).map((m: any, i: number) => (
                    <li key={i}>{m.searchKeyword?.label || m.searchKeyword?.info || "keyword"} — {m.monthlySearchCounts?.[0]?.count ?? 0}</li>
                  ))}
                </ul>
              ) : <div className="text-sm text-gray-500">No GBP keyword data.</div>}
            </div>
          ) : <div className="p-4 text-sm text-gray-500">Select a GBP location in Connections.</div>}
        </div>

        {/* User-entered keywords: SERP rank */}
        <div className="border rounded-lg">
          <div className="px-4 py-3 border-b font-medium">Check rankings for your own keywords</div>
          <div className="p-4 space-y-3">
            <textarea
              className="w-full border rounded p-2 text-sm h-28"
              placeholder="Enter one keyword per line"
              value={customKeywords}
              onChange={(e) => setCustomKeywords(e.target.value)}
            />
            <div>
              <button
                onClick={runSerp}
                disabled={serpLoading}
                className="px-3 py-1.5 rounded bg-black text-white disabled:opacity-50"
              >
                {serpLoading ? "Checking…" : "Check SERP ranks"}
              </button>
              <span className="text-xs text-gray-500 ml-2">
                Uses selected country/state above.
              </span>
            </div>

            {!!serpRows.length && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-600">
                    <tr>
                      <th className="py-2">Keyword</th>
                      <th className="py-2">Top Result (rank 1)</th>
                      <th className="py-2">URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serpRows.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-2 pr-4">{r.keyword}</td>
                        <td className="py-2">{r.title || "-"}</td>
                        <td className="py-2"><a className="text-blue-600 underline" href={r.url} target="_blank">{r.url || "-"}</a></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Right rail */}
      <aside className="space-y-4">
        <div className="border rounded-lg p-4">
          <div className="font-medium mb-1">AI Insight</div>
          <p className="text-sm text-gray-600">Ask questions about your connected data here. (Stub UI)</p>
        </div>
      </aside>
    </main>
  );
}
