// components/GSCSitePicker.tsx
"use client";

import React from "react";

type Option = { id: string; title: string };
type Props = {
  value?: string;
  onChange?: (v: string | undefined) => void;
  disabled?: boolean;
  className?: string;
};

export default function GSCSitePicker({ value, onChange, disabled, className }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [opts, setOpts] = React.useState<Option[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let live = true;
    setLoading(true);
    fetch("/api/gsc/sites")
      .then((r) => r.json())
      .then((data) => {
        if (!live) return;
        setOpts(data?.sites ?? []);
        setError(null);
      })
      .catch((e) => live && setError(e?.message || "Failed to load sites"))
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
        <option value="">{loading ? "Loading..." : "Select Search Console property"}</option>
        {opts.map((o) => (
          <option key={o.id} value={o.id}>
            {o.title}
          </option>
        ))}
      </select>
      {error && <div className="text-red-600 text-sm mt-1">{error}</div>}
    </div>
  );
}
