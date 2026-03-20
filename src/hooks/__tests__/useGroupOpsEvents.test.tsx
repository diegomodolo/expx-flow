import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGroupOpsEvents } from "../useGroupOpsEvents";
import React from "react";

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [
              { id: "1", type: "MESSAGE", timestamp: "2023-10-01" },
              { id: "2", type: "CHECKIN_REPLY", timestamp: "2023-10-02" },
            ],
            error: null,
          }),
        }),
      }),
    },
  };
});

// Mock do CompanyContext
vi.mock("@/contexts/CompanyContext", () => ({
  useCompany: vi.fn().mockReturnValue({
    activeCompany: { company_id: "company-1", name: "Empresa Teste" },
  }),
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

describe("useGroupOpsEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("deve renderizar com estado inicial vazio e retornar dados com sucesso", async () => {
    const { result } = renderHook(() => useGroupOpsEvents(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.events).toHaveLength(2);
    expect(result.current.events[0].id).toBe("1");
    expect(result.current.events[1].type).toBe("CHECKIN_REPLY");
  });

  it("deve carregar eventos filtrados por groupId", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const mockEq = vi.fn().mockReturnThis();

    // Configura uma chain fluente em que eq retorna outro objeto com eq
    const mockQueryWithGroupId = {
      eq: mockEq,
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    const mockInitialEq = vi.fn().mockReturnValue(mockQueryWithGroupId);

    // O código original faz:
    // .select('*')
    // .eq('company_id', companyId)
    // .order('timestamp', { ascending: false })
    // .limit(200);
    //
    // E DEPOIS faz: query.eq('group_id', groupId) em cima do retorno de limit().
    // Na verdade, order() e limit() retornam promises em Supabase.
    // Vamos apenas mockar o eq globalmente para verificar todas as chamadas usando mock.calls
    const spiedEq = vi.fn().mockReturnThis();

    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: spiedEq,
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          eq: spiedEq, // caso o limit retorne algo em que eq é chamado
          then: (cb: any) => cb({ data: [], error: null })
        }),
      }),
    } as any);

    const { result } = renderHook(() => useGroupOpsEvents("group-123"), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(spiedEq).toHaveBeenCalledWith("company_id", "company-1");
    expect(spiedEq).toHaveBeenCalledWith("group_id", "group-123");
  });

  it("deve tratar erro ao carregar eventos", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    vi.mocked(supabase.from("groupops_events").select("*").eq("company_id", "company-1").order("timestamp").limit(200))
      // Mudamos o valor de retorno da promessa do mock da limit só para esse teste
      .then = undefined;

    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: new Error("Erro na API"),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useGroupOpsEvents(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Como o useQuery engole o throw do error em fallback de cache,
    // garantimos que os eventos sejam array vazio em caso de falha.
    expect(result.current.events).toEqual([]);
  });
});
