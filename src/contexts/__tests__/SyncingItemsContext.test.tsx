import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ReactNode } from "react";
import { SyncingItemsProvider, useSyncingItems } from "../SyncingItemsContext";

function wrapper({ children }: { children: ReactNode }) {
  return <SyncingItemsProvider>{children}</SyncingItemsProvider>;
}

describe("SyncingItemsContext", () => {
  it("inicia com nenhum item em syncing", () => {
    const { result } = renderHook(() => useSyncingItems(), { wrapper });
    expect(result.current.syncingItems.size).toBe(0);
  });

  it("addSyncingItem marca item como syncing", () => {
    const { result } = renderHook(() => useSyncingItems(), { wrapper });

    act(() => {
      result.current.addSyncingItem("item-1");
    });

    expect(result.current.isSyncing("item-1")).toBe(true);
  });

  it("removeSyncingItem desmarca item", () => {
    const { result } = renderHook(() => useSyncingItems(), { wrapper });

    act(() => {
      result.current.addSyncingItem("item-1");
    });
    expect(result.current.isSyncing("item-1")).toBe(true);

    act(() => {
      result.current.removeSyncingItem("item-1");
    });
    expect(result.current.isSyncing("item-1")).toBe(false);
  });

  it("gerencia multiplos itens simultaneamente", () => {
    const { result } = renderHook(() => useSyncingItems(), { wrapper });

    act(() => {
      result.current.addSyncingItem("item-1");
      result.current.addSyncingItem("item-2");
      result.current.addSyncingItem("item-3");
    });

    expect(result.current.isSyncing("item-1")).toBe(true);
    expect(result.current.isSyncing("item-2")).toBe(true);
    expect(result.current.isSyncing("item-3")).toBe(true);

    act(() => {
      result.current.removeSyncingItem("item-2");
    });

    expect(result.current.isSyncing("item-1")).toBe(true);
    expect(result.current.isSyncing("item-2")).toBe(false);
    expect(result.current.isSyncing("item-3")).toBe(true);
  });

  it("isSyncing retorna false para item desconhecido", () => {
    const { result } = renderHook(() => useSyncingItems(), { wrapper });
    expect(result.current.isSyncing("nao-existe")).toBe(false);
  });

  it("lanca erro quando usado fora do provider", () => {
    expect(() => {
      renderHook(() => useSyncingItems());
    }).toThrow("useSyncingItems must be used within a SyncingItemsProvider");
  });
});
