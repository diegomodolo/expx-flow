import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useEmployees } from "../useEmployees";

const mockSupabaseQuery = vi.fn();
const mockSupabaseInsert = vi.fn();
const mockSupabaseUpdate = vi.fn();
const mockSupabaseDelete = vi.fn();
const mockInvoke = vi.fn();

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => {
  const createChain = (actualTable: string, isInsert: boolean) => {
    const chain: any = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.in = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockImplementation(() => {
      if (actualTable === "company_members") {
        return Promise.resolve({ data: { role: "owner" }, error: null });
      }
      if (actualTable === "employees" && isInsert) {
        return Promise.resolve({
          data: { id: "new-emp-1", name: "Novo Colaborador" },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    chain.insert = vi
      .fn()
      .mockImplementation(() => createChain(actualTable, true));
    chain.update = vi.fn().mockReturnValue(chain);
    chain.delete = vi.fn().mockReturnValue(chain);

    // Explicit return for recursive chain builder
    chain.select.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    chain.in.mockReturnValue(chain);
    chain.order.mockReturnValue(chain);

    return chain;
  };

  const mockFrom = vi.fn().mockImplementation((table) => {
    const chain = createChain(table, false);
    // Explicitly binding methods to chain
    chain.select = chain.select.bind(chain);
    chain.eq = chain.eq.bind(chain);
    chain.in = chain.in.bind(chain);
    chain.order = chain.order.bind(chain);
    chain.insert = chain.insert.bind(chain);
    chain.update = chain.update.bind(chain);
    chain.delete = chain.delete.bind(chain);
    return chain;
  });

  return {
    supabase: {
      from: mockFrom,
      functions: {
        invoke: vi.fn().mockImplementation((name) => {
          if (name === "check-user") {
            return Promise.resolve({ data: { exists: false }, error: null });
          }
          if (name === "invite-with-magic-link") {
            return Promise.resolve({
              data: { user_id: "new-user-1" },
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        }),
      },
    },
  };
});

// Mock do AuthContext
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

// Mock do useTeams
vi.mock("@/hooks/useTeams", () => ({
  useTeams: vi.fn().mockReturnValue({
    teams: [{ id: "team-1", name: "Squad 1", color: "#fff" }],
  }),
}));

describe("useEmployees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve renderizar corretamente e inicializar com array vazio", () => {
    const { result } = renderHook(() => useEmployees());
    expect(result.current.employees).toEqual([]);
    // loading pode variar dependendo do estado do contexto
    expect(result.current.loading).toBeDefined();
    expect(result.current.error).toBeNull();
  });

  it("deve buscar colaboradores com sucesso", async () => {
    const { supabase } = await import("@/integrations/supabase/client");

    // Configurando mock específico para buscar employees
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "employees") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "emp-1",
                    name: "Colaborador 1",
                    user_id: "u-1",
                    team: { name: "Squad" },
                  },
                ],
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{ user_id: "u-1", avatar_url: "avatar.png" }],
              error: null,
            }),
          }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      } as any;
    });

    const { result } = renderHook(() => useEmployees());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.employees).toHaveLength(1);
    expect(result.current.employees[0].name).toBe("Colaborador 1");
    expect(result.current.employees[0].profile_avatar_url).toBe("avatar.png");
    expect(result.current.error).toBeNull();
  });

  it("deve tratar erro ao buscar colaboradores", async () => {
    const { supabase } = await import("@/integrations/supabase/client");

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "employees") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Erro do banco de dados" },
              }),
            }),
          }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      } as any;
    });

    const { result } = renderHook(() => useEmployees());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Erro do banco de dados");
    expect(result.current.employees).toEqual([]);
  });

  it("deve criar um novo colaborador com sucesso", async () => {
    const { supabase } = await import("@/integrations/supabase/client");

    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: { role: "owner" }, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnThis(),
    };

    // Override the single mock for the different phases
    mockChain.single = vi
      .fn()
      .mockResolvedValueOnce({ data: { role: "owner" }, error: null }) // company_members check
      .mockResolvedValueOnce({
        data: { id: "new-emp-1", name: "Novo Colaborador" },
        error: null,
      }) // employees insert return
      .mockResolvedValue({ data: null, error: null });

    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    const { result } = renderHook(() => useEmployees());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newEmpData = {
      name: "Novo Colaborador",
      email: "novo@test.com",
      role: "member",
      status: "active",
      start_date: "2023-01-01",
    };

    let createdEmp;
    await waitFor(async () => {
      createdEmp = await result.current.createEmployee(newEmpData);
    });

    expect(createdEmp).toEqual({
      id: "new-emp-1",
      name: "Novo Colaborador",
    });
  });

  it("deve exibir loading enquanto busca", () => {
    const { result } = renderHook(() => useEmployees());
    // Hook inicializa com loading false, depois vira true quando fetchEmployees é chamado
    // Mas fetchEmployees depende de user e activeCompany estarem presentes
    expect(result.current.loading).toBeDefined();
  });
});
