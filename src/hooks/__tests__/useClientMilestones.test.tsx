import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useClientMilestones } from "../useClientMilestones";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createWrapper } from "@/test/test-utils";

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => {
  const eqMockForSelect = vi.fn().mockReturnValue({
    order: vi.fn().mockResolvedValue({
      data: [
        {
          id: "1",
          client_id: "client-1",
          company_id: "company-1",
          milestone_type: "onboarding",
          title: "Setup",
          description: null,
          status: "completed",
          completed_at: "2023-01-01T00:00:00.000Z",
          celebrated_at: null,
          celebration_sent: false,
          celebration_method: null,
          metrics_snapshot: null,
          milestone_order: 1,
          created_at: "2023-01-01T00:00:00.000Z",
          updated_at: "2023-01-01T00:00:00.000Z",
        },
        {
          id: "2",
          client_id: "client-1",
          company_id: "company-1",
          milestone_type: "first_campaign",
          title: "Primeira Campanha",
          description: null,
          status: "pending",
          completed_at: null,
          celebrated_at: null,
          celebration_sent: false,
          celebration_method: null,
          metrics_snapshot: null,
          milestone_order: 2,
          created_at: "2023-01-01T00:00:00.000Z",
          updated_at: "2023-01-01T00:00:00.000Z",
        },
      ],
      error: null,
    }),
  });

  const eqMockForUpdate = vi.fn().mockResolvedValue({
    error: null,
  });

  const selectMock = vi.fn().mockReturnValue({
    eq: eqMockForSelect,
  });

  const updateMock = vi.fn().mockReturnValue({
    eq: eqMockForUpdate,
  });

  const insertMock = vi.fn().mockResolvedValue({
    error: null,
  });

  return {
    supabase: {
      from: vi.fn().mockReturnValue({
        select: selectMock,
        update: updateMock,
        insert: insertMock,
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

// Mock do sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useClientMilestones", () => {
  const wrapper = createWrapper();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve carregar os milestones corretamente", async () => {
    const { result } = renderHook(() => useClientMilestones(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.milestones).toHaveLength(2);
    expect(result.current.milestones[0].title).toBe("Setup");
    expect(result.current.milestones[0].status).toBe("completed");

    // Teste de cálculo do progresso do onboarding (1 completed de 2 total = 50%)
    expect(result.current.onboardingProgress).toBe(50);
  });

  it("deve completar um milestone com sucesso", async () => {
    const { result } = renderHook(() => useClientMilestones(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.completeMilestone.mutate({ milestoneId: "2" });

    await waitFor(() => {
      expect(result.current.completeMilestone.isSuccess).toBe(true);
    });

    expect(supabase.from).toHaveBeenCalledWith("client_milestones");
    expect(toast.success).toHaveBeenCalledWith("Milestone concluído!");
  });

  it("deve celebrar um milestone com sucesso", async () => {
    const { result } = renderHook(() => useClientMilestones(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.celebrateMilestone.mutate({
      milestoneId: "1",
      method: "whatsapp",
    });

    await waitFor(() => {
      expect(result.current.celebrateMilestone.isSuccess).toBe(true);
    });

    expect(supabase.from).toHaveBeenCalledWith("client_milestones");
    expect(toast.success).toHaveBeenCalledWith("Celebração enviada!");
  });

  it("deve criar um milestone com sucesso", async () => {
    const { result } = renderHook(() => useClientMilestones(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.createMilestone.mutate({
      clientId: "client-1",
      companyId: "company-1",
      milestoneType: "custom",
      title: "Novo Milestone",
      description: null,
      status: "pending",
      milestoneOrder: 3,
      completedAt: null,
      celebratedAt: null,
      celebrationSent: false,
      celebrationMethod: null,
      metricsSnapshot: null,
    });

    await waitFor(() => {
      expect(result.current.createMilestone.isSuccess).toBe(true);
    });

    expect(supabase.from).toHaveBeenCalledWith("client_milestones");
    expect(toast.success).toHaveBeenCalledWith("Milestone criado!");
  });

  it("deve exibir erro se a criacao de milestone falhar", async () => {
    // Simular erro na inserção
    const mockFrom = supabase.from as unknown as ReturnType<typeof vi.fn>;
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: new Error("Erro de banco") }),
    });

    const { result } = renderHook(() => useClientMilestones(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.createMilestone.mutate({
      clientId: "client-1",
      companyId: "company-1",
      milestoneType: "custom",
      title: "Novo Milestone",
      description: null,
      status: "pending",
      milestoneOrder: 3,
      completedAt: null,
      celebratedAt: null,
      celebrationSent: false,
      celebrationMethod: null,
      metricsSnapshot: null,
    });

    await waitFor(() => {
      expect(result.current.createMilestone.isError).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith("Erro ao criar milestone");
  });
});
