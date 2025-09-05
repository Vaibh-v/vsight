// lib/serp.ts
import { normalizeRegion } from "./geo";

export type SerpInput = {
  keywords: string[];
  region: { country: string; state?: string }; // e.g. { country: "USA", state?: "CA" }
  topN?: number;           // default 10
  domain?: string;         // optional: highlight rank of your site
  startDate?: string;      // optional, for freshness hints
  endDate?: string;        // optional
  provider?: "brave" | "dataforseo";
};

export type SerpResultRow = {
  keyword: string;
  rank: number;
  url: string;
  title?: string;
  provider: "brave" | "dataforseo";
  serp_type?: string;
  pixel_position?: number;
  domain_match?: boolean;
};

export type SerpResult = {
  keyword: string;
  rows: SerpResultRow[];
};

const PROVIDER = (process.env.SERP_PROVIDER || "brave") as "brave" | "dataforseo";

// ---------- Brave ----------
async function braveOneKeyword(
  keyword: string,
  braveKey: string,
  countryISO2: string,
  topN: number
): Promise<SerpResultRow[]> {
  // Brave web search: https://api.search.brave.com/res/v1/web/search
  // Params we use: q, count, country (alpha-2)
  const u = new URL("https://api.search.brave.com/res/v1/web/search");
  u.searchParams.set("q", keyword);
  u.searchParams.set("count", String(topN));
  // Brave uses lower-case ISO2 (e.g. "us", "in", "gb"). If missing, Brave auto-detects.
  if (countryISO2) u.searchParams.set("country", countryISO2);

  const res = await fetch(u.toString(), {
    headers: { "X-Subscription-Token": braveKey },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brave ${res.status}: ${body}`);
  }

  const json: any = await res.json();
  const items: any[] =
    json?.web?.results ||
    json?.mixed?.results?.filter((r: any) => r.type === "web")?.flatMap((r: any) => r.results || []) ||
    [];

  return items.slice(0, topN).map((it: any, i: number) => ({
    keyword,
    rank: i + 1,
    url: it?.url || it?.link || "",
    title: it?.title || it?.meta?.title,
    provider: "brave" as const,
  }));
}

async function braveSearch(input: SerpInput): Promise<SerpResult[]> {
  const braveKey = process.env.BRAVE_API_KEY || "";
  if (!braveKey) throw new Error("BRAVE_API_KEY not configured");

  const { braveCountry } = normalizeRegion(input.region.country, input.region.state);
  const topN = input.topN || 10;

  const perKeyword = await Promise.all(
    input.keywords.map(async (kw) => {
      const rows = await braveOneKeyword(kw, braveKey, braveCountry, topN);
      // Optional domain highlight
      const withDomain = input.domain
        ? rows.map((r) => ({ ...r, domain_match: r.url.includes(input.domain!) }))
        : rows;
      return { keyword: kw, rows: withDomain };
    })
  );
  return perKeyword;
}

// ---------- DataForSEO ----------
async function dataForSeoSearch(input: SerpInput): Promise<SerpResult[]> {
  const login = process.env.DATAFORSEO_LOGIN || "";
  const password = process.env.DATAFORSEO_PASSWORD || "";
  if (!login || !password) throw new Error("DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD not configured");

  const { dfsLocationName } = normalizeRegion(input.region.country, input.region.state);
  const topN = input.topN || 10;

  // We call the "live advanced" endpoint keyword-by-keyword.
  const endpoint = "https://api.dataforseo.com/v3/serp/google/organic/live/advanced";

  const results: SerpResult[] = [];
  for (const kw of input.keywords) {
    const body = [
      {
        location_name: dfsLocationName,
        language_name: "English",
        keyword: kw,
        // You can add device, depth, parsing params if needed
        // e.g., "device": "desktop"
      },
    ];

    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Basic auth:
      // node fetch will set Authorization header for us if we embed in the URL,
      // but easier to do via header:
      // @ts-ignore – Type definition doesn't include this but node supports it
      // Note: Some runtimes require manual base64. Vercel/node supports "username:password" via "Authorization".
      // We'll do manual base64 for portability:
    });

    // Manual Basic Auth header (some environments ignore curl-like -u):
    // Re-send with Authorization if needed:
    if (r.status === 401 || r.status === 403) {
      const r2 = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + Buffer.from(`${login}:${password}`).toString("base64"),
        },
        body: JSON.stringify(body),
      });
      const txt2 = await r2.text();
      if (!r2.ok) throw new Error(`DataForSEO ${r2.status}: ${txt2}`);
      const j2 = JSON.parse(txt2);
      results.push(convertDfs(kw, j2, input.domain, topN));
      continue;
    }

    const txt = await r.text();
    if (!r.ok) throw new Error(`DataForSEO ${r.status}: ${txt}`);
    const j = JSON.parse(txt);
    results.push(convertDfs(kw, j, input.domain, topN));
  }

  return results;
}

function convertDfs(keyword: string, j: any, domain: string | undefined, topN: number): SerpResult {
  const tasks = j?.tasks || [];
  const items: any[] = tasks[0]?.result?.[0]?.items || [];
  const rows: SerpResultRow[] = items
    .filter((it) => it?.type === "organic")
    .slice(0, topN)
    .map((it, i) => ({
      keyword,
      rank: it?.rank_absolute ?? i + 1,
      url: it?.url,
      title: it?.title,
      provider: "dataforseo" as const,
      serp_type: it?.type,
      pixel_position: it?.xpath ?? undefined,
      domain_match: domain ? String(it?.url || "").includes(domain) : undefined,
    }));

  return { keyword, rows };
}

// ---------- Public facade ----------
export async function getSerpRanks(input: SerpInput): Promise<SerpResult[]> {
  const provider = (input.provider || PROVIDER) as "brave" | "dataforseo";
  if (provider === "dataforseo") return dataForSeoSearch(input);
  return braveSearch(input);
}
