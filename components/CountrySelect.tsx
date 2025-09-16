// components/CountrySelect.tsx
import React from "react";

type Props = {
  value: string; // ISO like "US" or "" for All
  onChange: (v: string | undefined) => void;
  className?: string;
};

const COUNTRIES: Array<{ code: string; label: string }> = [
  { code: "", label: "All countries" },
  { code: "US", label: "United States" },
  { code: "IN", label: "India" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "SG", label: "Singapore" },
  { code: "AE", label: "United Arab Emirates" },
];

export default function CountrySelect({ value, onChange, className }: Props) {
  return (
    <select
      className={className ?? "w-full border rounded px-2 py-2"}
      value={value}
      onChange={(e) => onChange(e.target.value || undefined)}
    >
      {COUNTRIES.map((c) => (
        <option key={c.code || "ALL"} value={c.code}>
          {c.label}
        </option>
      ))}
    </select>
  );
}
