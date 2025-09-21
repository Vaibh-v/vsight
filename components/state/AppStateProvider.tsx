// components/state/AppStateProvider.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Types
 */
export type Region = {
  /** ISO 3166-1 alpha-2 (e.g., "US"). Required at the type level. */
  country: string;
  /** Optional state/region code (e.g., "CA"). */
  state?: string | null;
};

export type DateRange = {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
};

export type Selections = {
  /** GA4 propertyId, if connected/selected */
  propertyId?: string;
  /** GSC site URL, if connected/selected */
  siteUrl?: string;
  /** Active region selection (country required in type) */
  region: Region;
  /** Active date range */
  dateRange?: DateRange;
  /** Any additional keys you extend later (integrations, filters, etc.) */
  [key: string]: any;
};

type AppState = {
  selections: Selections;
  setSelections: React.Dispatch<React.SetStateAction<Selections>>;
  /** Merge-style updater accepted across the app */
  updateSelections: (patch: Partial<Selections>) => void;
  /** Reset to defaults */
  resetSelections: () => void;
};

/**
 * Storage keys/utilities
 */
const STORAGE_KEY = "vsight:selections";

function loadFromStorage(): Selections | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function saveToStorage(next: Selections) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors (private mode, quota, etc.)
  }
}

/**
 * Defaults
 */
const DEFAULT_SELECTIONS: Selections = {
  region: {
    country: "", // required by type; default empty string
    state: undefined,
  },
  dateRange: undefined,
  propertyId: undefined,
  siteUrl: undefined,
};

/**
 * Context
 */
const AppStateContext = createContext<AppState | undefined>(undefined);

/**
 * Provider
 */
export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [selections, setSelections] = useState<Selections>(() => {
    return loadFromStorage() ?? DEFAULT_SELECTIONS;
  });

  // Persist on change
  useEffect(() => {
    saveToStorage(selections);
  }, [selections]);

  /**
   * Merge-style updater that guarantees Region’s type shape.
   * - If the patch contains region-like keys (country/state), we build Region explicitly.
   * - Otherwise we keep existing region.
   * - Everything else merges shallowly.
   */
  const updateSelections = useCallback((patch: Partial<Selections>) => {
    setSelections((prev) => {
      // Pull potential region fields from the incoming patch (support both `region: { ... }`
      // and top-level `country`/`state` if your UI patches that way).
      const incomingRegionObj =
        (patch.region && typeof patch.region === "object" ? patch.region : undefined) as
          | Partial<Region>
          | undefined;

      const hasTopLevelCountry = Object.prototype.hasOwnProperty.call(patch, "country");
      const hasTopLevelState = Object.prototype.hasOwnProperty.call(patch, "state");

      const nextRegion: Region = {
        country:
          (incomingRegionObj?.country ??
            // @ts-ignore allow reading accidental top-level values if present in some callers
            (hasTopLevelCountry ? (patch as any).country : undefined) ??
            prev.region?.country ??
            ""),
        state:
          incomingRegionObj?.state ??
          // @ts-ignore see note above
          (hasTopLevelState ? (patch as any).state : prev.region?.state),
      };

      // Build the final object: start with prev, shallow-merge patch,
      // then force our well-typed region to avoid optional-country errors.
      const next: Selections = {
        ...prev,
        ...patch,
        region: nextRegion,
      };

      saveToStorage(next);
      return next;
    });
  }, []);

  const resetSelections = useCallback(() => {
    setSelections(DEFAULT_SELECTIONS);
    saveToStorage(DEFAULT_SELECTIONS);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      selections,
      setSelections,
      updateSelections,
      resetSelections,
    }),
    [selections, updateSelections, resetSelections]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

/**
 * Hook
 */
export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used within <AppStateProvider>");
  }
  return ctx;
}
