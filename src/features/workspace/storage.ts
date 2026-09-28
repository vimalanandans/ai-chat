import type { DrawerMode, DrawerTab, TaskSession } from "./types";

export interface PersistedWorkspace { sessions: TaskSession[]; activeSessionId: string; drawerMode: DrawerMode; drawerTab: DrawerTab; navMode: "full" | "compact" | "hidden"; }
const DB = "signal-workspace";
const STORE = "state";
const KEY = "primary";

export async function loadWorkspace(): Promise<PersistedWorkspace | undefined> {
  if (typeof window === "undefined" || !window.indexedDB) return undefined;
  return new Promise((resolve) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onerror = () => resolve(undefined);
    request.onsuccess = () => {
      const transaction = request.result.transaction(STORE, "readonly");
      const get = transaction.objectStore(STORE).get(KEY);
      get.onsuccess = () => resolve(get.result as PersistedWorkspace | undefined);
      get.onerror = () => resolve(undefined);
    };
  });
}

export async function saveWorkspace(value: PersistedWorkspace): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) return;
  return new Promise((resolve) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => {
      const transaction = request.result.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(value, KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    };
    request.onerror = () => resolve();
  });
}
