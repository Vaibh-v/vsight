// components/CountrySelect.tsx
import React from "react";

type Opt = { label: string; value: string };

const COUNTRIES: Opt[] = [
  { label: "All countries", value: "" },
  { label: "United States", value: "COUNTRY_US" },
  { label: "India", value: "COUNTRY_IN" },
  { label: "United Kingdom", value: "COUNTRY_GB" },
  { label: "Canada", value: "COUNTRY_CA" },
  { label: "Australia", value: "COUNTRY_AU" },
  { label: "Germany", value: "COUNTRY_DE" },
  { label: "France", value: "COUNTRY_FR" },
  { label: "Singapore", value: "COUNTRY_SG" },
  // add more as needed
];

export default function CountrySelect({
  value,
  onChange,
  disabled,
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
  disabled?: boolean;
}) {
  return (
    <select
      className="border rounded px-2 py-1 w-full"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || undefined)}
      disabled={disabled}
    >
      {COUNTRIES.map((c) => (
        <option key={c.value || "ALL"} value={c.value}>
          {c.label}
        </option>
      ))}
    </select>
  );
}
