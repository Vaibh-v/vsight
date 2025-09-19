// pages/privacy.tsx
import Head from "next/head";

export default function Privacy() {
  const title = "VSight — Privacy Policy";
  const url = "https://vsight-two.vercel.app/privacy";
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={url} />
      </Head>

      <main className="mx-auto max-w-3xl px-6 py-12 text-zinc-800">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <p className="mt-6">
          This Privacy Policy explains how <strong>VSight</strong> (“we”, “our”,
          or “us”) collects, uses and protects information when you access or
          use our website and services (the “Service”).
        </p>

        <h2 className="mt-8 text-xl font-semibold">Who we are</h2>
        <p className="mt-2">
          VSight provides unified analytics and AI insights for marketing and
          SEO teams by connecting to third-party platforms such as Google
          Analytics 4, Google Search Console and Google Business Profile.
          {/* TODO: Replace with your legal entity & address */}
          Our contact email is <a className="underline" href="mailto:support@vsight.app">support@vsight.app</a>.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Information we collect</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>
            <strong>Account Information.</strong> Your name, email address and
            Google account ID provided via Google Sign-In (OAuth 2.0).
          </li>
          <li>
            <strong>OAuth Tokens.</strong> We obtain access tokens from Google
            with your consent to read data from the services you select. We do
            not collect or store your Google password.
          </li>
          <li>
            <strong>Connected-Account Data.</strong> Read-only analytics from:
            <ul className="mt-1 list-disc pl-5">
              <li>
                <em>Google Analytics 4 (GA4):</em> sessions, active users, top
                pages and similar metrics.
              </li>
              <li>
                <em>Google Search Console (GSC):</em> clicks, impressions, CTR,
                average position, queries and pages.
              </li>
              <li>
                <em>Google Business Profile (GBP):</em> locations and insights
                (e.g., discovery, calls, direction requests).
              </li>
            </ul>
          </li>
          <li>
            <strong>Usage Data.</strong> Log data about how you use the Service
            (e.g., feature clicks, timestamps, device/browser information),
            strictly for reliability, security and product improvement.
          </li>
          <li>
            <strong>Cookies.</strong> We use cookies and local storage to keep
            you signed in and remember preferences. You can control cookies via
            your browser.
          </li>
          <li>
            <strong>Support Content.</strong> Information you provide when
            contacting support or giving feedback.
          </li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold">How we use information</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>Provide, maintain and improve the Service and its features.</li>
          <li>Create dashboards and generate insights from your connected data.</li>
          <li>Authenticate you and secure your account.</li>
          <li>Communicate with you about product updates and support.</li>
          <li>Comply with legal obligations and enforce our Terms.</li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold">Google user data</h2>
        <p className="mt-2">
          Our use of information received from Google APIs will adhere to the{" "}
          <a
            className="underline"
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. We request{" "}
          <em>read-only</em> scopes to retrieve analytics for your accounts. We
          do not sell Google user data. We do not use Google user data to serve
          ads.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Lawful bases (EEA/UK)</h2>
        <p className="mt-2">
          Where GDPR applies, we rely on the following legal bases:
        </p>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>
            <strong>Consent</strong> for connecting third-party accounts via
            OAuth and processing their data.
          </li>
          <li>
            <strong>Legitimate Interests</strong> for product analytics,
            security and communications related to the Service.
          </li>
          {/* TODO: If you need Contract/legal obligation, add here. */}
        </ul>

        <h2 className="mt-8 text-xl font-semibold">Sharing & processors</h2>
        <p className="mt-2">
          We do not sell personal data. We may share limited data with service
          providers acting as processors (e.g., cloud hosting, error logging,
          analytics) under data-processing agreements and subject to strict
          confidentiality and security obligations.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Data retention</h2>
        <p className="mt-2">
          We retain personal data only as long as needed to provide the Service
          and for legitimate business or legal purposes. You can disconnect
          integrations at any time. We honor deletion requests within a
          reasonable period (see “Your rights” below).
        </p>

        <h2 className="mt-8 text-xl font-semibold">Security</h2>
        <p className="mt-2">
          We use industry-standard measures to protect data in transit and at
          rest, apply least-privilege access, and monitor for abuse. No method
          of transmission or storage is 100% secure, but we continuously work to
          strengthen safeguards.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Your rights</h2>
        <p className="mt-2">
          Depending on your location, you may have rights to access, correct,
          delete or export your data, object to or restrict certain processing,
          and withdraw consent. To exercise rights:
        </p>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>
            Email us at{" "}
            <a className="underline" href="mailto:support@vsight.app">
              support@vsight.app
            </a>{" "}
            with your request.
          </li>
          <li>
            To revoke Google access, visit{" "}
            <a
              className="underline"
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noreferrer"
            >
              Google Account &gt; Security &gt; Third-party access
            </a>{" "}
            and remove VSight.
          </li>
        </ul>
        <p className="mt-2">
          For California residents (CCPA/CPRA), we do not sell or share personal
          information for cross-context behavioral advertising. You may submit
          a request using the methods above.
        </p>

        <h2 className="mt-8 text-xl font-semibold">International transfers</h2>
        <p className="mt-2">
          We may process data in the United States and other countries where our
          providers operate. Where required, we rely on appropriate safeguards
          such as Standard Contractual Clauses.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Children’s privacy</h2>
        <p className="mt-2">
          The Service is not directed to children under 13 (or the equivalent
          age in your jurisdiction). We do not knowingly collect data from
          children.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Changes</h2>
        <p className="mt-2">
          We may update this Policy from time to time. We will post changes on
          this page and update the “Last updated” date above.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Contact</h2>
        <p className="mt-2">
          {/* TODO: add legal entity & postal address */}
          Email: <a className="underline" href="mailto:support@vsight.app">support@vsight.app</a>
        </p>
      </main>
    </>
  );
}
