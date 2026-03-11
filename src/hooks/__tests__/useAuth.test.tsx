import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "../useAuth";
import { MemoryRouter, useLocation } from "react-router-dom";
import React from "react";

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: "user-1", email: "test@test.com" } } },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      startAutoRefresh: vi.fn().mockResolvedValue(undefined),
      stopAutoRefresh: vi.fn().mockResolvedValue(undefined),
      signUp: vi
        .fn()
        .mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      signInWithPassword: vi
        .fn()
        .mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

// Mock para location (para testar rotas publicas vs privadas)
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...(actual as object),
    useLocation: vi.fn().mockReturnValue({ pathname: "/dashboard" }),
  };
});

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useLocation).mockReturnValue({
      pathname: "/dashboard",
    } as unknown as ReturnType<typeof useLocation>);
  });

  it("deve lancar erro quando usado fora do AuthProvider", () => {
    // Escondendo console.error temporariamente para suprimir a msg de erro do React
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within an AuthProvider",
    );
    consoleSpy.mockRestore();
  });

  it("deve inicializar corretamente em rotas privadas", async () => {
    const { supabase } = await import("@/integrations/supabase/client");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(supabase.auth.startAutoRefresh).toHaveBeenCalled();
    expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
    expect(supabase.auth.getSession).toHaveBeenCalled();

    expect(result.current.user).toEqual({
      id: "user-1",
      email: "test@test.com",
    });
    expect(result.current.session).toEqual({
      user: { id: "user-1", email: "test@test.com" },
    });
  });

  it("deve lidar com rotas publicas corretamente", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    vi.mocked(useLocation).mockReturnValue({
      pathname: "/dashboard-publico/test",
    } as unknown as ReturnType<typeof useLocation>);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(supabase.auth.stopAutoRefresh).toHaveBeenCalled();
    expect(supabase.auth.startAutoRefresh).not.toHaveBeenCalled();

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it("deve permitir signUp", async () => {
    const { supabase } = await import("@/integrations/supabase/client");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const signUpResult = await result.current.signUp(
      "test@test.com",
      "password123",
      "Test User",
    );

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: "test@test.com",
      password: "password123",
      options: { data: { full_name: "Test User" } },
    });

    expect(signUpResult.error).toBeNull();
  });

  it("deve permitir signIn", async () => {
    const { supabase } = await import("@/integrations/supabase/client");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const signInResult = await result.current.signIn(
      "test@test.com",
      "password123",
    );

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "test@test.com",
      password: "password123",
    });

    expect(signInResult.error).toBeNull();
  });

  it("deve permitir signOut", async () => {
    const { supabase } = await import("@/integrations/supabase/client");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const signOutResult = await result.current.signOut();

    expect(supabase.auth.signOut).toHaveBeenCalled();

    expect(signOutResult.error).toBeNull();
  });
});
