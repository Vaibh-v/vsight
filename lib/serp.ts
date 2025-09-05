type Input = {
  keywords: string[];
  region: { country: string; state?: string };
  topN: number;
  domain?: string;
};

export async function serpRank(input: Input) {
  const provider = (process.env.SERP_PROVIDER || "").toLowerCase(); // "brave" or "dataforseo"
  if (provider === "brave") return braveSerp(input);
  if (provider === "dataforseo") return dataForSeoSerp(input);
  throw new Error("SERP_PROVIDER not set. Use 'brave' or 'dataforseo'.");
}

// -------- Brave Search API ----------
async function braveSerp({ keywords, region, topN, domain }: Input) {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) throw new Error("BRAVE_API_KEY missing");

  const cc = toBraveCountry(region.country);
  const loc = region.state ? `${region.state},${cc}` : cc;

  const out: any[] = [];
  for (const kw of keywords) {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", kw);
    url.searchParams.set("count", String(topN));
    url.searchParams.set("country", cc);
    url.searchParams.set("search_lang", "en");
    // Brave doesn’t do state granularity directly; cc is the main lever

    const res = await fetch(url.toString(), { headers: { "X-Subscription-Token": apiKey } });
    if (!res.ok) throw new Error(`Brave error ${res.status}`);
    const j: any = await res.json();

    const rows = (j?.web?.results || []).map((r: any, i: number) => ({
      rank: i + 1,
      url: r.url,
      title: r.title,
      provider: "brave",
      domain_match: domain ? host(r.url) === host(domain) : false,
    }));

    out.push({ keyword: kw, region: { country: region.country, state: region.state }, rows });
  }
  return out;
}

// -------- DataForSEO ----------
async function dataForSeoSerp({ keywords, region, topN, domain }: Input) {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) throw new Error("DATAFORSEO_LOGIN/DATAFORSEO_PASSWORD missing");

  // Location handling kept simple; you can expand with DataForSEO location endpoints
  const countryCode = region.country;
  const payload = keywords.map((kw) => ({
    keyword: kw,
    language_code: "en",
    location_code: 2840, // default USA; replace via lookup if you wire their locations
    depth: topN,
  }));

  const res = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/advanced", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    // Basic auth:
    cache: "no-store",
    // @ts-ignore
    next: { revalidate: 0 },
  } as RequestInit);

  // Node fetch doesn’t support inline auth headers above; if needed:
  // const auth = "Basic " + Buffer.from(`${login}:${password}`).toString("base64");
  // ... and set headers: { Authorization: auth, ... }

  if (!res.ok) throw new Error(`DataForSEO error ${res.status}`);
  const j: any = await res.json();

  const out: any[] = [];
  for (let i = 0; i < keywords.length; i++) {
    const task = j.tasks?.[i];
    const items = task?.result?.[0]?.items || [];
    const rows = items.slice(0, topN).map((it: any, idx: number) => ({
      rank: idx + 1,
      url: it.url,
      title: it.title,
      provider: "dataforseo",
      domain_match: domain ? host(it.url) === host(domain) : false,
    }));
    out.push({ keyword: keywords[i], region, rows });
  }
  return out;
}

// Helpers
function host(u: string) {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; }
}
function toBraveCountry(iso3: string) {
  // quick map ISO3->ISO2 for common markets; extend as needed
  const map: Record<string, string> = { USA: "us", IND: "in", GBR: "gb", AUS: "au", CAN: "ca" };
  return map[iso3] || "us";
}
