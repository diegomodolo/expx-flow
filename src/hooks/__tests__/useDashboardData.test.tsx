import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useDashboardData } from "../useDashboardData";

// Mock do useAuth
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: "user-1", email: "test@test.com" },
  }),
}));

// Mock do CompanyContext
vi.mock("@/contexts/CompanyContext", () => ({
  useCompany: vi.fn().mockReturnValue({
    activeCompany: { company_id: "company-1", name: "Empresa Teste" },
  }),
}));

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => {
  const selectMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      gte: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
        lt: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
        // para o caso que apenas usa gte sem order nem lt (TrendsData, currentPeriodCampaigns)
        then: function (resolve: any) {
          resolve({ data: [], error: null });
        },
      }),
      order: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
      // para casos que só usam eq
      then: function (resolve: any) {
        resolve({ data: [], error: null });
      },
    }),
  });

  return {
    supabase: {
      from: vi.fn().mockReturnValue({
        select: selectMock,
      }),
      functions: {
        invoke: vi.fn().mockResolvedValue({
          data: { recommendation: "Mocked recommendation" },
          error: null,
        }),
      },
    },
  };
});

describe("useDashboardData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve inicializar corretamente e exibir loading", () => {
    const { result } = renderHook(() => useDashboardData());

    // Deve iniciar com loading true
    expect(result.current.loading).toBe(true);
    expect(result.current.metrics).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("deve buscar dados e atualizar o estado corretamente", async () => {
    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Os arrays devem ter sido iniciados vazios ou de acordo com o mock que retorna []
    expect(result.current.clientsPerformance).toEqual([]);
    expect(result.current.campaignRankings).toEqual([]);
    expect(result.current.trends).toEqual([]);
    expect(result.current.metrics).not.toBeNull();
  });

  it("deve tratar erro corretamente", async () => {
    const { supabase } = await import("@/integrations/supabase/client");

    // Simulando erro no primeiro `from('campaigns').select`
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          gte: vi.fn().mockRejectedValueOnce(new Error("Erro ao buscar dados do dashboard")),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Erro ao buscar dados do dashboard");
  });
});
