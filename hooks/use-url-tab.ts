"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const TAB_CHANGE_EVENT = "civilezy:tab-change";

function readTab(validTabs: ReadonlySet<string>, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const tab = new URLSearchParams(window.location.search).get("tab");
  return tab && validTabs.has(tab) ? tab : fallback;
}

export function pushUrlTab(tab: string, fallback = "overview") {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (tab === fallback) {
    url.searchParams.delete("tab");
  } else {
    url.searchParams.set("tab", tab);
  }

  window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new Event(TAB_CHANGE_EVENT));
}

export function useUrlTab<T extends string>(
  validTabs: readonly T[],
  fallback: T
): [T, (tab: string) => void] {
  const validSet = useMemo(() => new Set<string>(validTabs), [validTabs]);

  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener("popstate", onStoreChange);
    window.addEventListener(TAB_CHANGE_EVENT, onStoreChange);

    return () => {
      window.removeEventListener("popstate", onStoreChange);
      window.removeEventListener(TAB_CHANGE_EVENT, onStoreChange);
    };
  }, []);

  const getSnapshot = useCallback(
    () => readTab(validSet, fallback),
    [fallback, validSet]
  );

  const activeTab = useSyncExternalStore(subscribe, getSnapshot, () => fallback) as T;

  const setTab = useCallback(
    (tab: string) => {
      if (!validSet.has(tab)) return;
      pushUrlTab(tab, fallback);
    },
    [fallback, validSet]
  );

  return [activeTab, setTab];
}
