import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import "../styles/globals.css";
import { SWRConfig } from "swr";
import { AppStateProvider } from "../components/state/AppStateProvider";

export default function MyApp({ Component, pageProps }: AppProps) {
  // @ts-ignore – next-auth adds session on pageProps
  const { session, ...rest } = pageProps;
  return (
    <SessionProvider session={session}>
      <SWRConfig value={{ fetcher: (u: string) => fetch(u).then(r => r.json()), revalidateOnFocus: false, dedupingInterval: 60_000 }}>
        <AppStateProvider>
          <Component {...rest} />
        </AppStateProvider>
      </SWRConfig>
    </SessionProvider>
  );
}
