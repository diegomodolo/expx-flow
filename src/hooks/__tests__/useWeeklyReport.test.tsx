import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useWeeklyReport } from "../useWeeklyReport";
import React from "react";

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: "client-1",
              name: "Cliente Teste",
              company: "Empresa do Cliente",
              monthly_budget: 10000,
            },
            error: null,
          }),
        }),
      }),
    },
  };
});

// Mock do hook useAuth
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: "user-1", email: "user@test.com" },
  }),
}));

// Mock do CompanyContext
vi.mock("@/contexts/CompanyContext", () => ({
  useCompany: vi.fn().mockReturnValue({
    activeCompany: {
      company_id: "company-1",
      company: { name: "Minha Empresa Teste" },
    },
  }),
}));

describe("useWeeklyReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve renderizar com estado de loading e buscar dados corretamente", async () => {
    const { supabase } = await import("@/integrations/supabase/client");

    // Mock para clients
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: "client-1",
        name: "Cliente Teste",
        company: "Empresa do Cliente",
        monthly_budget: 10000,
      },
      error: null,
    });

    // Mock para campaigns (array) e ads (array)
    const mockMultipleEq = vi.fn().mockResolvedValue({
      data: [
        {
          id: "camp-1",
          name: "Campanha 1",
          status: "active",
          spend: 1000,
          conversions: 10,
          impressions: 5000,
          clicks: 100,
        },
      ],
      error: null,
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "clients") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: mockSingle,
              }),
            }),
          }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: mockMultipleEq,
          }),
        }),
      } as any;
    });

    const { result } = renderHook(() => useWeeklyReport("client-1"));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.reportData?.clientInfo.name).toBe("Cliente Teste");
    expect(result.current.reportData?.currentWeekMetrics.totalSpend).toBe(1000); // from our mock data
    expect(result.current.reportData?.currentWeekMetrics.totalConversions).toBe(10);
  });

  it("deve lidar com erros de requisição", async () => {
    const { supabase } = await import("@/integrations/supabase/client");

    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error("Erro ao buscar dados do cliente"),
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useWeeklyReport("client-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Erro ao buscar dados do cliente");
    expect(result.current.reportData).toBeNull();
  });
});
