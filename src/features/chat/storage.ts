import type { ChatStore } from "./types";

const databaseName = "signal-chat";
const storeName = "workspace";
const recordKey = "primary";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadChatStore(): Promise<ChatStore | undefined> {
  if (typeof window === "undefined" || !indexedDB) return undefined;
  try {
    const database = await openDatabase();
    return await new Promise((resolve) => {
      const request = database.transaction(storeName, "readonly").objectStore(storeName).get(recordKey);
      request.onsuccess = () => resolve(request.result as ChatStore | undefined);
      request.onerror = () => resolve(undefined);
    });
  } catch { return undefined; }
}

export async function saveChatStore(value: ChatStore): Promise<void> {
  if (typeof window === "undefined" || !indexedDB) return;
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve) => {
      const transaction = database.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).put(value, recordKey);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    });
  } catch { /* Browser storage is optional; chat remains usable for this visit. */ }
}
