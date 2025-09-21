import React, { useEffect, useState } from "react";

type Option = { id: string; title: string };

export default function GSCSitePicker({
  value,
  onChange
}: {
  value?: string;
  onChange: (v?: string) => void;
}) {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch("/api/gsc/sites");
        const d = await r.json();
        const rows = (d?.sites || []).map((s: any) => ({
          id: s.siteUrl,
          title: s.siteUrl
        }));
        if (mounted) setOptions(rows);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <select
      className="border rounded px-2 py-1"
      value={value || ""}
      onChange={(e) => onChange(e.target.value || undefined)}
      disabled={loading}
    >
      <option value="">{loading ? "Loading…" : "Select a GSC site"}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.title}</option>
      ))}
    </select>
  );
}
