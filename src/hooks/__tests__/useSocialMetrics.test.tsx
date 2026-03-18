import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useSocialMetrics } from "../useSocialMetrics";
import { createWrapper } from "@/test/test-utils";
import { supabase } from "@/integrations/supabase/client";

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { dashboard_token: "test-token" },
            error: null,
          }),
        }),
      }),
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: {
          social_metrics: { followers: 100, likes: 50 },
        },
        error: null,
      }),
    },
  },
}));

// Set query cache time options to 0 to avoid waiting for query retries

describe("useSocialMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve renderizar corretamente e retornar os dados", async () => {
    const { result } = renderHook(() => useSocialMetrics("client-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      social_metrics: { followers: 100, likes: 50 },
    });
    expect(supabase.from).toHaveBeenCalledWith("clients");
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      "client-dashboard-data",
      expect.any(Object),
    );
  });

  it("deve retornar null se cliente não tiver dashboard_token", async () => {
    // Mock para retornar null no token
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { dashboard_token: null },
            error: null,
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useSocialMetrics("client-2"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ social_metrics: null });
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it("deve exibir loading enquanto carrega", async () => {
    const { result } = renderHook(() => useSocialMetrics("client-1"), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it("deve tratar erro corretamente se function falhar", async () => {
    // Disable console.error to keep test output clean
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock para falhar a function
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: new Error("Erro na function"),
    } as any);

    const { result } = renderHook(() => useSocialMetrics("client-3"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
        expect(result.current.isError).toBe(true);
    }, { timeout: 3000 });

    expect(result.current.error).toBeDefined();

    consoleSpy.mockRestore();
  });
});
