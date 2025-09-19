// pages/index.tsx
import Head from "next/head";

export default function Home() {
  const title = "VSight — Unified Marketing & SEO Analytics";
  const description =
    "VSight connects Google Analytics 4, Search Console and Google Business Profile to produce unified dashboards and AI insights for growth teams.";
  const url = "https://vsight-two.vercel.app";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "VSight",
    url,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description,
    publisher: {
      "@type": "Organization",
      name: "VSight",
      url,
      sameAs: [],
    },
  };

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>

      <main className="min-h-screen bg-white text-zinc-900">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                Unified Analytics & AI Insights for SEO and Growth
              </h1>
              <p className="mt-5 text-lg text-zinc-600">
                VSight connects <strong>Google Analytics 4</strong>,{" "}
                <strong>Google Search Console</strong>, and{" "}
                <strong>Google Business Profile</strong> to give you a single
                source of truth—plus AI summaries that surface what changed and
                what to do next.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  className="rounded-xl bg-violet-600 px-5 py-3 text-white shadow hover:bg-violet-700"
                  href="/api/auth/signin"
                >
                  Sign in with Google
                </a>
                <a
                  className="rounded-xl border border-zinc-200 px-5 py-3 text-zinc-800 hover:bg-zinc-50"
                  href="#how-it-works"
                >
                  See how it works
                </a>
              </div>

              <p className="mt-3 text-sm text-zinc-500">
                We request read-only access to GA4, GSC and GBP to generate
                reports. You can revoke access at any time.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              {/* Placeholder “screenshot” box; replace with an <Image/> later */}
              <div className="aspect-video w-full rounded-xl bg-gradient-to-br from-zinc-50 to-zinc-100 ring-1 ring-inset ring-zinc-200" />
              <p className="mt-3 text-center text-xs text-zinc-500">
                Example dashboard preview
              </p>
            </div>
          </div>
        </section>

        {/* Integrations */}
        <section className="border-t border-zinc-100 bg-zinc-50" id="integrations">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <h2 className="text-2xl font-bold">Integrations</h2>
            <p className="mt-2 text-zinc-600">
              Connect one or more sources—VSight normalizes metrics and keeps
              identities scoped to your Google account.
            </p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  name: "Google Analytics 4",
                  text:
                    "Read-only access to sessions, users and top pages with day-level time series.",
                },
                {
                  name: "Google Search Console",
                  text:
                    "Read-only clicks, impressions, CTR and average position by query and page.",
                },
                {
                  name: "Google Business Profile",
                  text:
                    "Read locations & insights to monitor discovery, calls and direction requests.",
                },
              ].map((x) => (
                <li
                  key={x.name}
                  className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <p className="font-semibold">{x.name}</p>
                  <p className="mt-1 text-sm text-zinc-600">{x.text}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-zinc-500">
              Roadmap: Microsoft Clarity, Ahrefs, Semrush, SurferSEO and more.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-6 py-14" id="how-it-works">
          <h2 className="text-2xl font-bold">How it works</h2>
          <ol className="mt-6 space-y-4">
            <li className="rounded-xl border border-zinc-200 p-4">
              <strong>1. Sign in with Google.</strong> You’ll see a Google
              consent screen listing the read-only scopes we request.
            </li>
            <li className="rounded-xl border border-zinc-200 p-4">
              <strong>2. Select your GA4 property and GSC site.</strong> We pull
              only the data needed for your reports, never your password.
            </li>
            <li className="rounded-xl border border-zinc-200 p-4">
              <strong>3. Get dashboards & AI insights.</strong> VSight merges
              time series and surfaces what changed, why it matters and suggested
              next steps.
            </li>
          </ol>
        </section>

        {/* Security & Privacy */}
        <section className="border-y border-zinc-100 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <h2 className="text-2xl font-bold">Security & Privacy</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-zinc-700">
              <li>OAuth 2.0 — we never see or store your Google password.</li>
              <li>Read-only scopes; no changes are made in your accounts.</li>
              <li>Encrypted in transit and at rest; least-privileged access.</li>
              <li>
                You can delete your account data and revoke access anytime via
                Google Account &gt; Security &gt; Third-party access.
              </li>
            </ul>
            <div className="mt-6 flex gap-4">
              <a className="underline" href="/privacy">
                Privacy Policy
              </a>
              <a className="underline" href="/terms">
                Terms of Service
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-zinc-500">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>© {new Date().getFullYear()} VSight</span>
            <div className="flex gap-4">
              <a className="underline" href="/privacy">
                Privacy
              </a>
              <a className="underline" href="/terms">
                Terms
              </a>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
