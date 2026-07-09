"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "smartmeeting.sidebar.collapsed";

type SidebarStateContextValue = {
  collapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (value: boolean) => void;
};

const SidebarStateContext = createContext<SidebarStateContextValue | null>(null);

export function SidebarStateProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;

    try {
      return window.localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // Ignore storage write issues.
    }
  }, [collapsed]);

  const value = useMemo(
    () => ({
      collapsed,
      toggleCollapsed: () => setCollapsed((current) => !current),
      setCollapsed,
    }),
    [collapsed],
  );

  return (
    <SidebarStateContext.Provider value={value}>
      {children}
    </SidebarStateContext.Provider>
  );
}

export function useSidebarState() {
  const context = useContext(SidebarStateContext);

  if (!context) {
    throw new Error("useSidebarState must be used within SidebarStateProvider");
  }

  return context;
}
