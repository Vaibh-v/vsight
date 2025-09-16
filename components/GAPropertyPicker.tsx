import { useEffect, useState } from "react";

type Props = { value: string; onChange: (v: string) => void };

export default function GAPropertyPicker({ value, onChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Array<{ propertyId: string; displayName: string }>>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/ga4/properties");
        const json = await res.json();
        if (mounted) setItems(json.properties ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="border rounded px-2 py-1 w-full">
      <option value="">{loading ? "Loading…" : "Select a GA4 property…"}</option>
      {items.map(p => (
        <option key={p.propertyId} value={p.propertyId}>
          {p.displayName} (ID: {p.propertyId})
        </option>
      ))}
    </select>
  );
}
