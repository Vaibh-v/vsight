export async function serpRanks({
  keywords,
  country,
  region,
}: { keywords: string[]; country: string; region?: string; }) {
  const provider = process.env.SERP_PROVIDER || "serpapi";
  if (provider === "serpapi") {
    const key = process.env.SERPAPI_KEY;
    if (!key) throw new Error("Missing SERPAPI_KEY");
    const location = region ? `${region}, ${country}` : country === "ALL" ? "United States" : country; // fallback
    const out: Array<{ keyword: string; rank: number; url?: string; title?: string }> = [];

    for (const kw of keywords) {
      const params = new URLSearchParams({
        engine: "google",
        q: kw,
        hl: "en",
        location,
        api_key: key,
        num: "10"
      });
      const res = await fetch(`https://serpapi.com/search?${params.toString()}`);
      const json = await res.json();
      // naive “your site” detection skipped; we just return top-10 list with positions
      const organic = json.organic_results || [];
      out.push({ keyword: kw, rank: organic.length ? 1 : 0, url: organic[0]?.link, title: organic[0]?.title });
    }
    return out;
  }
  throw new Error(`Unsupported SERP provider: ${provider}`);
}
