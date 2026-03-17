import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useClients } from "../useClients";
import { supabase } from "@/integrations/supabase/client";
import { createWrapper } from "@/test/test-utils";

// Mock das permissões do funcionário
vi.mock("../useEmployeePermissions", () => ({
  useEmployeePermissions: vi.fn().mockReturnValue({
    currentUserPermissions: [],
    permissionsLoading: false,
    isOwner: true,
  }),
}));

// Mock do auth
vi.mock("../useAuth", () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: "user-1" },
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
  const inMock = vi.fn().mockResolvedValue({
    data: [],
    error: null,
  });

  const eqMockForGoogleCampaigns = vi.fn().mockReturnValue({
    in: inMock,
  });

  const eqMockForMetaCampaigns = vi.fn().mockReturnValue({
    in: inMock,
  });

  const orderMockForClients = vi.fn().mockResolvedValue({
    data: [
      {
        id: "client-1",
        name: "Cliente 1",
        status: "green",
        calculated_status: "green",
        ad_account_id: "ad-1",
        google_account_id: null,
        meta_monthly_budget: 1000,
        google_monthly_budget: 0,
        monthly_budget: 1000,
      },
    ],
    error: null,
  });

  const selectMock = vi.fn().mockImplementation((columns) => {
    // Para insert mock return single
    if (!columns) {
      return {
        single: vi
          .fn()
          .mockResolvedValue({
            data: { id: "new-client", name: "Novo Cliente" },
            error: null,
          }),
      };
    }

    if (columns.includes("client_id, spend")) {
      // Retornar mocks para campaigns e google_campaigns
      return { eq: vi.fn().mockReturnValue({ in: inMock }) };
    }

    // Para .from("clients") no fetchClients
    const queryBuilder: any = {
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      in: inMock,
      order: orderMockForClients,
    };

    return queryBuilder;
  });

  const eqMockForUpdateDelete = vi.fn().mockResolvedValue({
    error: null,
  });

  const updateMock = vi.fn().mockReturnValue({
    eq: eqMockForUpdateDelete,
  });

  const deleteMock = vi.fn().mockReturnValue({
    eq: eqMockForUpdateDelete,
  });

  const insertMock = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi
        .fn()
        .mockResolvedValue({
          data: { id: "new-client", name: "Novo Cliente" },
          error: null,
        }),
    }),
  });

  return {
    supabase: {
      from: vi.fn().mockImplementation((table) => {
        return {
          select: selectMock,
          update: updateMock,
          delete: deleteMock,
          insert: insertMock,
        };
      }),
      functions: {
        invoke: vi
          .fn()
          .mockResolvedValue({
            data: { success: true, successCount: 1 },
            error: null,
          }),
      },
    },
  };
});

describe("useClients", () => {
  const wrapper = createWrapper();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve carregar a lista de clientes corretamente", async () => {
    const { result } = renderHook(() => useClients(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.clients).toHaveLength(1);
    expect(result.current.clients[0].name).toBe("Cliente 1");
    expect(result.current.clients[0].status).toBe("excelente");
    expect(result.current.clients[0].consolidated_budget).toBe(1000);
    expect(result.current.clients[0].has_meta).toBe(true);
    expect(result.current.clients[0].has_google).toBe(false);
  });

  it("deve criar um cliente com sucesso", async () => {
    const { result } = renderHook(() => useClients(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newClient = await result.current.createClient({
      name: "Novo Cliente",
      email: "novo@cliente.com",
      status: "excelente",
    } as any);

    expect(newClient).toEqual({ id: "new-client", name: "Novo Cliente" });
    expect(supabase.from).toHaveBeenCalledWith("clients");
  });

  it("deve atualizar um cliente com sucesso", async () => {
    const { result } = renderHook(() => useClients(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.updateClient("client-1", {
      name: "Cliente Atualizado",
    });

    // Expect supabase.from('clients').update to have been called
    expect(supabase.from).toHaveBeenCalledWith("clients");
  });

  it("deve deletar um cliente com sucesso", async () => {
    const { result } = renderHook(() => useClients(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.deleteClient("client-1");

    expect(supabase.from).toHaveBeenCalledWith("clients");
  });

  it("deve recalcular status com sucesso", async () => {
    const { result } = renderHook(() => useClients(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const res = await result.current.recalculateAllStatus();

    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      "recalculate-client-statuses",
      expect.any(Object),
    );
    expect(res.success).toBe(true);
  });
});
