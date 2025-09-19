// components/CountrySelect.tsx
"use client";

import React from "react";

const COUNTRIES = [
  { code: "ALL", name: "All Countries" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "IN", name: "India" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "SG", name: "Singapore" },
  { code: "AE", name: "United Arab Emirates" },
];

type Props = {
  value?: string;
  onChange?: (v: string | undefined) => void;
  className?: string;
};

export default function CountrySelect({ value, onChange, className }: Props) {
  return (
    <select
      className={`w-full border rounded px-3 py-2 ${className || ""}`}
      value={value ?? "ALL"}
      onChange={(e) => {
        const v = e.target.value;
        onChange?.(v === "ALL" ? undefined : v);
      }}
    >
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
