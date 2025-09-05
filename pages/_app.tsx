import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import "../styles/globals.css";
import { AppStateProvider } from "../components/state/AppStateProvider";
import Layout from "../components/Layout";

export default function MyApp({ Component, pageProps }: AppProps & { pageProps: any }) {
  return (
    <SessionProvider session={pageProps.session}>
      <AppStateProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </AppStateProvider>
    </SessionProvider>
  );
}
