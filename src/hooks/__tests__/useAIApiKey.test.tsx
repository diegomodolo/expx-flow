import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createWrapper } from "@/test/test-utils";
import { useAIApiKey } from "../useAIApiKey";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "1" },
            error: null,
          }),
        }),
      }),
      upsert: vi.fn().mockResolvedValue({
        error: null,
      }),
    }),
  },
}));

// Mock do CompanyContext
const mockUseCompany = vi.fn();
vi.mock("@/contexts/CompanyContext", () => ({
  useCompany: () => mockUseCompany(),
}));

// Mock do Sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useAIApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCompany.mockReturnValue({
      activeCompany: { company_id: "company-1", name: "Empresa Teste" },
    });
  });

  it("deve renderizar corretamente e retornar null se nao tiver companyId", async () => {
    mockUseCompany.mockReturnValue({
      activeCompany: null,
    });

    const { result } = renderHook(() => useAIApiKey(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // when enabled is false (companyId is null), useQuery returns undefined for data.
    expect(result.current.maskedKey).toBeUndefined();
    expect(result.current.hasKey).toBe(false);
  });

  it("deve buscar e retornar maskedKey se ja existir api key", async () => {
    const { result } = renderHook(() => useAIApiKey(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.maskedKey).toBe("••••••••••");
    expect(result.current.hasKey).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith("ai_api_keys");
  });

  it("deve tratar erro ao buscar api key", async () => {
    const error = new Error("Erro ao buscar API key");
    // @ts-ignore
    supabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockRejectedValue(error),
        }),
      }),
    });

    const { result } = renderHook(() => useAIApiKey(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.maskedKey).toBeUndefined();
  });

  it("deve salvar a api key e mostrar mensagem de sucesso", async () => {
    const { result } = renderHook(() => useAIApiKey(), {
      wrapper: createWrapper(),
    });

    await result.current.saveKey.mutateAsync("sk-test-key");

    expect(supabase.from).toHaveBeenCalledWith("ai_api_keys");
    // @ts-ignore
    expect(supabase.from().upsert).toHaveBeenCalledWith(
      { company_id: "company-1", openrouter_api_key: "sk-test-key" },
      { onConflict: "company_id" }
    );
    expect(toast.success).toHaveBeenCalledWith("API key salva com sucesso");
  });

  it("deve falhar ao salvar api key se nao tiver empresa selecionada", async () => {
    mockUseCompany.mockReturnValue({
      activeCompany: null,
    });

    const { result } = renderHook(() => useAIApiKey(), {
      wrapper: createWrapper(),
    });

    try {
      await result.current.saveKey.mutateAsync("sk-test-key");
    } catch (e) {
      expect(e).toEqual(new Error("Empresa não selecionada"));
    }

    expect(toast.error).toHaveBeenCalledWith("Erro ao salvar API key", {
      description: "Empresa não selecionada",
    });
  });

  it("deve falhar ao salvar api key se o supabase retornar erro", async () => {
    const error = new Error("Erro do Supabase");
    // @ts-ignore
    supabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "1" },
            error: null,
          }),
        }),
      }),
    }).mockReturnValueOnce({
      upsert: vi.fn().mockResolvedValue({
        error,
      }),
    });

    const { result } = renderHook(() => useAIApiKey(), {
      wrapper: createWrapper(),
    });

    try {
      await result.current.saveKey.mutateAsync("sk-test-key");
    } catch (e) {
      expect(e).toEqual(error);
    }

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Erro ao salvar API key", {
        description: "Erro do Supabase",
      });
    });
  });
});
