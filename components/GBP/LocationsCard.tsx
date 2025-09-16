// components/GBP/LocationsCard.tsx
import React, { useEffect, useState } from "react";

type Location = {
  name?: string; // "locations/123"
  title?: string;
  websiteUri?: string;
  phoneNumbers?: { primaryPhone?: string };
  storefrontAddress?: { addressLines?: string[]; locality?: string; administrativeArea?: string; postalCode?: string; countryCode?: string };
  categories?: { primaryCategory?: { displayName?: string } };
  regularHours?: any;
};

export default function LocationsCard() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [rows, setRows] = useState<Location[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        const r = await fetch("/api/gbp/locations");
        const j = await r.json();
        if (!r.ok) throw new Error(j?.detail || j?.error || "Failed to load locations");
        setRows(j.locations || []);
      } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="border rounded p-3">
      <div className="font-medium mb-2">GBP Locations</div>
      {loading && <div>Loading…</div>}
      {err && <div className="text-red-600">{err}</div>}
      {!loading && !err && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Title</th><th>Category</th><th>Phone</th><th>Website</th><th>Address</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td className="py-4 text-gray-500" colSpan={5}>No locations found.</td></tr>}
            {rows.map((l, i) => (
              <tr key={l.name || i} className="border-b">
                <td className="py-2 pr-2">{l.title || "-"}</td>
                <td>{l.categories?.primaryCategory?.displayName || "-"}</td>
                <td>{l.phoneNumbers?.primaryPhone || "-"}</td>
                <td>{l.websiteUri ? <a className="underline" href={l.websiteUri} target="_blank" rel="noreferrer">Website</a> : "-"}</td>
                <td>
                  {[
                    ...(l.storefrontAddress?.addressLines ?? []),
                    l.storefrontAddress?.locality,
                    l.storefrontAddress?.administrativeArea,
                    l.storefrontAddress?.postalCode,
                    l.storefrontAddress?.countryCode,
                  ].filter(Boolean).join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="text-xs text-gray-500 mt-2">Powered by Business Information API.</div>
    </div>
  );
}
