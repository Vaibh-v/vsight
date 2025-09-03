import React, { createContext, useContext, useEffect, useState } from "react";

type AppState = {
  gaPropertyId?: string;
  gscSiteUrl?: string;
  gbpLocationName?: string;
  dateRange: "last_28_days" | "last_90_days";
  country: string;
  setState: (s: Partial<AppState>) => void;
};

const Ctx = createContext<AppState | null>(null);
const KEY = "vsight:state";

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, set] = useState<AppState>({
    dateRange: "last_28_days",
    country: "USA",
  } as AppState);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) set(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const setState = (s: Partial<AppState>) => set((prev) => ({ ...prev, ...s }));
  return <Ctx.Provider value={{ ...state, setState }}>{children}</Ctx.Provider>;
};

export const useAppState = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
};
