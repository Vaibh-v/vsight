import React from "react";
const COUNTRIES = ["", "US", "GB", "CA", "IN", "AU", "DE", "FR", "NL", "SG", "AE"];

export default function CountrySelect({
  value,
  onChange
}: {
  value?: string;
  onChange: (v?: string) => void;
}) {
  return (
    <select
      className="border rounded px-2 py-1"
      value={value || ""}
      onChange={(e) => onChange(e.target.value || undefined)}
    >
      {COUNTRIES.map(c => (
        <option key={c || "blank"} value={c}>{c ? c : "All countries"}</option>
      ))}
    </select>
  );
}
