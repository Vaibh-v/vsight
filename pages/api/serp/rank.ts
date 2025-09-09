// pages/api/serp/rank.ts
import type { NextApiRequest, NextApiResponse } from "next";

type Row = { rank: number; url: string; title?: string };
type Result = {
  keyword: string;
  rows: (Row & { provider: string; domain_match?: boolean })[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { keywords, region, topN = 10, domain } = req.body || {};
  if (!Array.isArray(keywords) || !keywords.length) {
    return res.status(400).json({ error: "keywords[] required" });
  }
  const provider = (process.env.SERP_PROVIDER || "").toLowerCase();

  try {
    let data: Result[] | null = null;

    // Preferred provider
    if (provider === "brave") {
      try {
        data = await braveRank(keywords, region, topN, domain);
      } catch (e: any) {
        // Rate limited? fall back if creds available
        if (String(e.message || "").includes("429") && process.env.DATAFORSEO_LOGIN) {
          data = await dataforseoRank(keywords, region, topN, domain);
        } else {
          throw e;
        }
      }
    } else if (provider === "dataforseo") {
      data = await dataforseoRank(keywords, region, topN, domain);
    } else {
      return res.status(500).json({
        error: "SERP_PROVIDER not set. Use 'brave' or 'dataforseo'.",
      });
    }

    res.status(200).json({ data });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "SERP error" });
  }
}

async function braveRank(
  keywords: string[],
  region: { country: string; state?: string },
  topN: number,
  domain?: string
): Promise<Result[]> {
  const key = process.env.BRAVE_API_KEY;
  if (!key) throw new Error("BRAVE_API_KEY missing");

  const out: Result[] = [];
  // Simple sequential w/ tiny delay to avoid 429
  for (const kw of keywords) {
    const qParams = new URLSearchParams({
      q: kw,
      count: String(Math.min(topN, 50)),
      country: region.country || "USA",
    });
    if (region.state) qParams.set("state", region.state);

    const resp = await fetch(`https://api.search.brave.com/res/v1/web/search?${qParams.toString()}`, {
      headers: { "X-Subscription-Token": key },
    });

    if (resp.status === 429) {
      throw new Error("Brave error 429");
    }
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Brave error ${resp.status}: ${txt}`);
    }
    const j = (await resp.json()) as any;
    const web = j?.web?.results || [];
    const rows: Result["rows"] = web.slice(0, topN).map((r: any, i: number) => ({
      rank: i + 1,
      url: r.url,
      title: r.title,
      provider: "brave",
      domain_match: domain ? r.url?.includes(domain) : undefined,
    }));
    out.push({ keyword: kw, rows });
    await sleep(200); // backoff
  }
  return out;
}

async function dataforseoRank(
  keywords: string[],
  region: { country: string; state?: string },
  topN: number,
  domain?: string
): Promise<Result[]> {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) throw new Error("DATAFORSEO credentials missing");

  // Minimal SERP Live crawl (Google organic) example
  // Docs: https://docs.dataforseo.com/v3/serp/google/organic/live/overview/
  const auth = "Basic " + Buffer.from(`${login}:${password}`).toString("base64");

  const tasks = keywords.map((kw) => ({
    language_code: "en",
    location_code: 2840, // USA; consider mapping by region.country
    keyword: kw,
    depth: Math.min(topN, 100),
  }));

  const resp = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/regular", {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify(tasks),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`DataForSEO error ${resp.status}: ${txt}`);
  }
  const j = (await resp.json()) as any;

  const out: Result[] = [];
  for (let i = 0; i < j.tasks?.length; i++) {
    const task = j.tasks[i];
    const kw = tasks[i].keyword;
    const items = task?.result?.[0]?.items || [];
    const rows: Result["rows"] = items.slice(0, topN).map((r: any, idx: number) => ({
      rank: r.rank_absolute ?? idx + 1,
      url: r.url,
      title: r.title,
      provider: "dataforseo",
      domain_match: domain ? r.url?.includes(domain) : undefined,
    }));
    out.push({ keyword: kw, rows });
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
