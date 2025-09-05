// lib/geo.ts
// Minimal country map; add more as you need.
export const COUNTRY_MAP: Record<string, { name: string; iso2: string }> = {
  USA: { name: "United States", iso2: "US" },
  IND: { name: "India", iso2: "IN" },
  GBR: { name: "United Kingdom", iso2: "GB" },
  AUS: { name: "Australia", iso2: "AU" },
  CAN: { name: "Canada", iso2: "CA" },
};

export function normalizeRegion(countryCode: string, state?: string) {
  const entry = COUNTRY_MAP[countryCode] || { name: countryCode, iso2: countryCode.slice(0, 2).toUpperCase() };
  const countryName = entry.name;
  const iso2 = entry.iso2.toLowerCase();
  // For DataForSEO we’ll send a human string; for Brave we’ll send the alpha-2 (lowercase).
  const dfsLocationName = state ? `${state}, ${countryName}` : countryName;
  const braveCountry = iso2; // e.g. "us", "in", "gb"
  return { countryName, dfsLocationName, braveCountry };
}
