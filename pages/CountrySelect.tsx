// components/CountrySelect.tsx
import * as React from "react";

// Small curated list; expand as needed or swap to an ISO-3166 list.
const COUNTRIES = [
  { label: "— All countries —", code: "" },
  { label: "United States", code: "COUNTRY_US" },
  { label: "India", code: "COUNTRY_IN" },
  { label: "United Kingdom", code: "COUNTRY_GB" },
  { label: "Canada", code: "COUNTRY_CA" },
  { label: "Australia", code: "COUNTRY_AU" },
];

export default function CountrySelect({
  value,
  onChange,
}: { value: string; onChange: (v: string) => void }) {
  return (
    <select className="w-full border rounded px-3 py-2" value={value} onChange={(e)=>onChange(e.target.value)}>
      {COUNTRIES.map(c => <option key={c.code || "ALL"} value={c.code}>{c.label}</option>)}
    </select>
  );
}
