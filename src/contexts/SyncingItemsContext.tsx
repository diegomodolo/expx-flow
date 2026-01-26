import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface SyncingItemsContextType {
  syncingItems: Set<string>;
  addSyncingItem: (id: string) => void;
  removeSyncingItem: (id: string) => void;
  isSyncing: (id: string) => boolean;
}

const SyncingItemsContext = createContext<SyncingItemsContextType | undefined>(undefined);

export function SyncingItemsProvider({ children }: { children: ReactNode }) {
  const [syncingItems, setSyncingItems] = useState<Set<string>>(new Set());

  const addSyncingItem = useCallback((id: string) => {
    setSyncingItems((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const removeSyncingItem = useCallback((id: string) => {
    setSyncingItems((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const isSyncing = useCallback((id: string) => {
    return syncingItems.has(id);
  }, [syncingItems]);

  return (
    <SyncingItemsContext.Provider value={{ syncingItems, addSyncingItem, removeSyncingItem, isSyncing }}>
      {children}
    </SyncingItemsContext.Provider>
  );
}

export function useSyncingItems() {
  const context = useContext(SyncingItemsContext);
  if (context === undefined) {
    throw new Error("useSyncingItems must be used within a SyncingItemsProvider");
  }
  return context;
}
