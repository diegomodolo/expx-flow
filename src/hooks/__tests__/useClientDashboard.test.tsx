import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useClientDashboard } from "../useClientDashboard";
import React from "react";

// Mock do Supabase Public Client
vi.mock("@/integrations/supabase/publicClient", () => ({
  supabasePublic: {
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: {
          client: { name: "Client Test" },
          period: { start_date: "2023-01-01", end_date: "2023-01-31", days: 31 },
          metrics: { spend: 100, leads: 10 },
          timeline: [],
          top_campaigns: [],
          campaigns_table: [],
        },
        error: null,
      }),
    },
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("useClientDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("deve renderizar e carregar dados com sucesso", async () => {
    const { result } = renderHook(
      () => useClientDashboard("test-token", "2023-01-01", "2023-01-31", "last_30d"),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.client.name).toBe("Client Test");
    expect(result.current.data?.metrics.spend).toBe(100);
  });

  it("deve repassar o preset corretamente para a API", async () => {
    const { supabasePublic } = await import("@/integrations/supabase/publicClient");

    renderHook(
      () => useClientDashboard("test-token", "2023-01-01", "2023-01-31", "last_30d"),
      { wrapper }
    );

    await waitFor(() => {
      expect(supabasePublic.functions.invoke).toHaveBeenCalledWith(
        "client-dashboard-data",
        {
          body: {
            token: "test-token",
            start_date: "2023-01-01",
            end_date: "2023-01-31",
            preset: "last_30d",
          },
        }
      );
    });
  });

  it("deve lidar com erro na chamada da API", async () => {
    const { supabasePublic } = await import("@/integrations/supabase/publicClient");

    vi.mocked(supabasePublic.functions.invoke).mockResolvedValueOnce({
      data: null,
      error: new Error("Erro ao carregar dashboard"),
    });

    const { result } = renderHook(
      () => useClientDashboard("test-token", "2023-01-01", "2023-01-31"),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe("Erro ao carregar dashboard");
  });
});
