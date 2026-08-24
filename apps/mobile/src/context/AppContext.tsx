import { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import type { MeState } from "@seeuaround/shared";
import { api } from "../lib/api";
import { getToken } from "../lib/auth-store";

type AppContextValue = {
  me: MeState | null;
  loading: boolean;
  refresh: () => Promise<MeState | null>;
  setMe: (state: MeState | null) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<MeState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setMe(null);
      setLoading(false);
      return null;
    }
    try {
      const state = await api.getMeState();
      setMe(state);
      return state;
    } catch {
      setMe(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ me, loading, refresh, setMe }),
    [me, loading, refresh],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp outside provider");
  return ctx;
}
