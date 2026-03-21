import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAutomationLogs } from "../useAutomationLogs";
import { createWrapper } from "@/test/test-utils";
import { supabase } from "@/integrations/supabase/client";

// Mock do Toast
const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock do Auth
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: "user-1" },
  }),
}));

// Mock do CompanyContext
vi.mock("@/contexts/CompanyContext", () => ({
  useCompany: vi.fn().mockReturnValue({
    activeCompany: { company_id: "company-1" },
  }),
}));

const mockQueryChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  then: vi.fn((resolve) => resolve({ data: [{ id: "log-1" }], error: null })),
};

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => mockQueryChain),
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: { success: true },
        error: null,
      }),
    },
  },
}));

describe("useAutomationLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryChain.then = vi.fn((resolve) => resolve({ data: [{ id: "log-1" }], error: null }));
  });

  it("deve inicializar e buscar logs", async () => {
    const { result } = renderHook(() => useAutomationLogs(), {
      wrapper: createWrapper(),
    });

    // Estado inicial é loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.logs).toEqual([{ id: "log-1" }]);
    expect(supabase.from).toHaveBeenCalledWith("campaign_automation_logs");
  });

  it("deve tratar erro na busca de logs", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockQueryChain.then = vi.fn((resolve) => resolve({ data: null, error: new Error("DB Error") }));

    const { result } = renderHook(() => useAutomationLogs(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: "Erro",
      description: "Erro ao carregar logs.",
      variant: "destructive",
    });
    expect(result.current.logs).toEqual([]);
    consoleSpy.mockRestore();
  });

  it("deve reverter ação com sucesso", async () => {
    const { result } = renderHook(() => useAutomationLogs(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let res;
    await act(async () => {
      res = await result.current.rollbackAction("log-1");
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      "rollback-automation-action",
      { body: { log_id: "log-1" } }
    );
    expect(mockToast).toHaveBeenCalledWith({
      title: "Ação revertida",
      description: "A ação foi revertida com sucesso.",
    });
    expect(res).toEqual({ success: true });
  });

  it("deve tratar erro ao reverter ação", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: null,
      error: new Error("Erro na function"),
    } as any);

    const { result } = renderHook(() => useAutomationLogs(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
        expect(result.current.loading).toBe(false);
    });

    let res;
    await act(async () => {
      res = await result.current.rollbackAction("log-1");
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: "Erro ao reverter",
      description: "Erro na function",
      variant: "destructive",
    });
    expect(res).toBeNull();
  });

  it("deve limpar logs com sucesso", async () => {
    mockQueryChain.then = vi.fn((resolve) => resolve({ data: [{ id: "log-1" }, { id: "log-2" }], error: null }));

    const { result } = renderHook(() => useAutomationLogs("client-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
        expect(result.current.loading).toBe(false);
    });

    let res;
    await act(async () => {
      res = await result.current.clearLogs();
    });

    expect(supabase.from).toHaveBeenCalledWith("campaign_automation_logs");
    expect(mockQueryChain.delete).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith({
      title: "Logs limpos",
      description: "2 logs de automação foram removidos.",
    });
    expect(res).toBe(true);
  });

  it("não deve limpar logs se clientId estiver ausente", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useAutomationLogs(null), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
        expect(result.current.loading).toBe(false);
    });

    let res;
    await act(async () => {
      res = await result.current.clearLogs();
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: "Erro",
      description: "Cliente ou empresa não identificados.",
      variant: "destructive",
    });
    expect(res).toBe(false);

    consoleSpy.mockRestore();
  });
});
