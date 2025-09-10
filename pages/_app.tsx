// pages/_app.tsx
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";
import { AppStateProvider } from "@/components/state/AppStateProvider";
import Layout from "@/components/Layout";
import "@/styles/globals.css";

const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) {
    let msg = `Request failed: ${r.status}`;
    try {
      const j = await r.json();
      if (j?.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }
  return r.json();
};

export default function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <AppStateProvider>
        <SWRConfig value={{ fetcher, revalidateOnFocus: false }}>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </SWRConfig>
      </AppStateProvider>
    </SessionProvider>
  );
}
