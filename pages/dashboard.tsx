import React, { useEffect, useState } from "react";

export default function Dashboard() {
  const [sites, setSites] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [siteUrl, setSiteUrl] = useState<string>("");
  const [propertyId, setPropertyId] = useState<string>("");

  // load GA & GSC lists
  useEffect(() => {
    (async () => {
      try {
        const s = await fetch("/api/gsc/sites").then((r) => r.json());
        setSites(s?.sites || []);
      } catch {}
    })();
  }, []);

  // you likely have an existing route for GA properties; if not, quickly wire a page call below:
  useEffect(() => {
    (async () => {
      try {
        // quick client fetch that calls lib/google via an ad-hoc API
        const r = await fetch("/api/ga/properties").then((x) => x.json()).catch(() => null);
        if (r?.properties) setProperties(r.properties);
      } catch {}
    })();
  }, []);

  // quick synthetic API for GA properties (only used by this page if you don’t already have one)
  // (delete if you already have /api/ga/properties)
  // NOTE: Next will tree-shake if duplicate; keep only one route in pages/api if you add a real one.
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold mb-4">Default Dashboard</h1>

      <div className="flex gap-4 items-center mb-4">
        <select
          className="border rounded px-3 py-2"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
        >
          <option value="">Select GA4 property…</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName} (#{p.id})
            </option>
          ))}
        </select>

        <select
          className="border rounded px-3 py-2"
          value={siteUrl}
          onChange={(e) => setSiteUrl(e.target.value)}
        >
          <option value="">Select GSC site…</option>
          {sites.map((s) => (
            <option key={s.siteUrl} value={s.siteUrl}>
              {s.siteUrl}
            </option>
          ))}
        </select>

        <button
          className="px-3 py-2 rounded bg-violet-600 text-white disabled:opacity-50"
          disabled={!propertyId || !siteUrl}
          onClick={async () => {
            const params = new URLSearchParams({
              propertyId,
              siteUrl,
              startDate: "2025-08-01",
              endDate: "2025-09-10",
            }).toString();
            const r = await fetch(`/api/aggregations/default?${params}`).then((x) => x.json());
            setSeries(r?.series || []);
          }}
        >
          Run
        </button>
      </div>

      <pre className="bg-gray-50 border rounded p-4 text-sm overflow-auto">
        {JSON.stringify(series, null, 2)}
      </pre>
    </div>
  );
}
