import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import AuthPage from "../AuthPage";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// Mocking useAuth hook
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

// Mocking useToast hook
vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(),
}));

describe("AuthPage", () => {
  const mockSignIn = vi.fn();
  const mockToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useToast).mockReturnValue({
      toast: mockToast,
    } as unknown as ReturnType<typeof useToast>);

    vi.mocked(useAuth).mockReturnValue({
      signIn: mockSignIn,
      user: null,
    } as unknown as ReturnType<typeof useAuth>);
  });

  it("deve renderizar corretamente o formulario de login", async () => {
    renderWithProviders(<AuthPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Entrar no Sistema")[0]).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Senha")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /entrar no sistema/i }),
      ).toBeInTheDocument();
    });
  });

  it("deve fazer login e exibir sucesso", async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValueOnce({ error: null });

    renderWithProviders(<AuthPage />);

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Senha");
    const submitBtn = screen.getByRole("button", {
      name: /entrar no sistema/i,
    });

    await user.type(emailInput, "test@test.com");
    await user.type(passwordInput, "123456");
    await user.click(submitBtn);

    expect(mockSignIn).toHaveBeenCalledWith("test@test.com", "123456");
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Login realizado com sucesso!",
      }),
    );
  });

  it("deve exibir loading enquanto carrega", async () => {
    const user = userEvent.setup();
    mockSignIn.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ error: null }), 500),
        ),
    );

    renderWithProviders(<AuthPage />);

    const submitBtn = screen.getByRole("button", {
      name: /entrar no sistema/i,
    });
    expect(submitBtn).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Senha"), "123456");
    await user.click(submitBtn);

    expect(
      screen.getByRole("button", { name: /entrando.../i }),
    ).toBeInTheDocument();
  });

  it("deve tratar erro de login corretamente", async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValueOnce({
      error: { message: "Credenciais invalidas" },
    });

    renderWithProviders(<AuthPage />);

    const submitBtn = screen.getByRole("button", {
      name: /entrar no sistema/i,
    });

    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Senha"), "wrong");
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Credenciais invalidas")).toBeInTheDocument();
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        title: "Erro no login",
      }),
    );
  });

  it("deve redirecionar caso o usuario ja esteja logado", async () => {
    vi.mocked(useAuth).mockReturnValue({
      signIn: mockSignIn,
      user: { id: "user-1" },
    } as unknown as ReturnType<typeof useAuth>);

    renderWithProviders(<AuthPage />);

    // AuthPage contains <Navigate to="/dashboard" replace /> which uses the router
    // We can't test full navigation directly without a more complex setup, but we can verify that the auth form doesn't render.
    await waitFor(() => {
      expect(screen.queryByText("Entrar no Sistema")).not.toBeInTheDocument();
    });
  });
});
