import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { AppStateProvider } from "../components/state/AppStateProvider";
import "../styles/globals.css";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={(pageProps as any).session}>
      <AppStateProvider>
        <Component {...pageProps} />
      </AppStateProvider>
    </SessionProvider>
  );
}
