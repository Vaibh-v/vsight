// components/GA4PropertyPicker.tsx
"use client";

import React from "react";

type Option = { id: string; displayName: string };
type Props = {
  value?: string;
  onChange?: (v: string | undefined) => void;
  disabled?: boolean;
  className?: string;
};

export default function GA4PropertyPicker({ value, onChange, disabled, className }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [opts, setOpts] = React.useState<Option[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let live = true;
    setLoading(true);
    fetch("/api/ga4/properties")
      .then((r) => r.json())
      .then((data) => {
        if (!live) return;
        setOpts(data?.properties ?? []);
        setError(null);
      })
      .catch((e) => live && setError(e?.message || "Failed to load GA4 properties"))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className={className}>
      <select
        className="w-full border rounded px-3 py-2"
        disabled={disabled || loading || !!error}
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value || undefined)}
      >
        <option value="">{loading ? "Loading..." : "Select GA4 property"}</option>
        {opts.map((o) => (
          <option key={o.id} value={o.id}>
            {o.displayName}
          </option>
        ))}
      </select>
      {error && <div className="text-red-600 text-sm mt-1">{error}</div>}
    </div>
  );
}
