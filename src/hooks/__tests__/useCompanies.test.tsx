import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCompanies } from "../useCompanies";

// Mock do useAuth
vi.mock("../useAuth", () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: "user-1" },
  }),
}));

// Mock do useToast
vi.mock("../use-toast", () => ({
  useToast: vi.fn().mockReturnValue({
    toast: vi.fn(),
  }),
}));

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => {
  const insertMock = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { id: "company-new", name: "Nova Empresa" },
        error: null,
      }),
    }),
  });

  const updateMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "company-1", name: "Empresa Atualizada" },
          error: null,
        }),
      }),
    }),
  });

  const selectMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({
      data: [
        {
          id: "member-1",
          company_id: "company-1",
          user_id: "user-1",
          company: { id: "company-1", name: "Empresa Teste" },
        },
      ],
      error: null,
    }),
  });

  return {
    supabase: {
      from: vi.fn().mockImplementation((table) => {
        if (table === "company_members") {
          return {
            select: selectMock,
          };
        } else if (table === "companies") {
          return {
            insert: insertMock,
            update: updateMock,
          };
        }
      }),
    },
  };
});

describe("useCompanies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve carregar as empresas do usuario corretamente", async () => {
    const { result } = renderHook(() => useCompanies());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.companies).toHaveLength(1);
    expect(result.current.companies[0].company?.name).toBe("Empresa Teste");
    expect(result.current.error).toBeNull();
  });

  it("deve tratar erro ao carregar empresas", async () => {
    const { supabase } = await import("@/integrations/supabase/client");

    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockRejectedValueOnce(new Error("Erro ao buscar empresas")),
      }),
    } as any);

    const { result } = renderHook(() => useCompanies());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Erro ao buscar empresas");
  });

  it("deve criar uma empresa com sucesso", async () => {
    const { result } = renderHook(() => useCompanies());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const { supabase } = await import("@/integrations/supabase/client");

    const newCompany = await result.current.createCompany({
      name: "Nova Empresa",
    });

    expect(newCompany).toEqual({ id: "company-new", name: "Nova Empresa" });
    expect(supabase.from).toHaveBeenCalledWith("companies");
  });

  it("deve atualizar uma empresa com sucesso", async () => {
    const { result } = renderHook(() => useCompanies());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const { supabase } = await import("@/integrations/supabase/client");

    const updatedCompany = await result.current.updateCompany("company-1", {
      name: "Empresa Atualizada",
    });

    expect(updatedCompany).toEqual({ id: "company-1", name: "Empresa Atualizada" });
    expect(supabase.from).toHaveBeenCalledWith("companies");
  });
});
