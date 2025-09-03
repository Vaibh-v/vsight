import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";
import "../styles/globals.css";
import { AppStateProvider } from "../components/state/AppStateProvider";

export default function MyApp({ Component, pageProps }: AppProps) {
  // @ts-ignore
  const { session, ...rest } = pageProps;
  return (
    <SessionProvider session={session}>
      <SWRConfig
        value={{
          fetcher: async (input: string | Request, init?: RequestInit) => {
            const res = await fetch(input as RequestInfo, init);
            if (!res.ok) {
              let msg = `HTTP ${res.status}`;
              try {
                const j = await res.json();
                msg = j.error || msg;
              } catch {}
              throw new Error(msg);
            }
            return res.json();
          },
          revalidateOnFocus: false
        }}
      >
        <AppStateProvider>
          <Component {...rest} />
        </AppStateProvider>
      </SWRConfig>
    </SessionProvider>
  );
}
