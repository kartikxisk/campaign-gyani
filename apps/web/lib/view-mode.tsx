'use client';
import { createContext, useCallback, useContext, useState } from 'react';

export type ViewMode = 'phishing' | 'email';
export const VIEW_MODE_COOKIE = 'cg_view';
const ONE_YEAR = 60 * 60 * 24 * 365;

/** Narrow any stored value to a known mode; phishing is the default. */
export function parseViewMode(raw: string | undefined | null): ViewMode {
  return raw === 'email' ? 'email' : 'phishing';
}

/** Pull the mode out of a `document.cookie`-style string. */
export function readViewModeCookie(cookie: string): ViewMode {
  const hit = cookie.split('; ').find((c) => c.startsWith(`${VIEW_MODE_COOKIE}=`));
  return parseViewMode(hit?.slice(VIEW_MODE_COOKIE.length + 1));
}

const ViewModeContext = createContext<{ mode: ViewMode; setMode: (m: ViewMode) => void }>({
  mode: 'phishing',
  setMode: () => undefined,
});

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  // Seed from the cookie on the first client render so the console paints in the
  // stored mode immediately — no flash of the default.
  const [mode, setModeState] = useState<ViewMode>(() =>
    typeof document === 'undefined' ? 'phishing' : readViewModeCookie(document.cookie),
  );
  const setMode = useCallback((m: ViewMode) => {
    setModeState(m);
    try { document.cookie = `${VIEW_MODE_COOKIE}=${m}; path=/; max-age=${ONE_YEAR}; samesite=lax`; } catch { /* storage blocked */ }
  }, []);
  return <ViewModeContext.Provider value={{ mode, setMode }}>{children}</ViewModeContext.Provider>;
}

export function useViewMode() {
  return useContext(ViewModeContext);
}
