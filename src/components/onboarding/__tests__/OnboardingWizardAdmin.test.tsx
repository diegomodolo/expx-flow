import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import {
  clearStoredProgress,
  storeProgress,
} from "@/components/onboarding/onboardingState";
import {
  getCachedInstallationStatus,
  invalidateInstallationStatus,
  setCachedInstallationStatus,
} from "@/guards/installationStatusCache";

/**
 * Task 3.2.2 — Passo admin + redirecionamento final (RED).
 */

describe("OnboardingWizard — passo admin + fechamento", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    clearStoredProgress();
    invalidateInstallationStatus();
  });

  it("form admin: email inválido bloqueia Avançar", async () => {
    const user = userEvent.setup();
    renderWithProviders(<OnboardingWizard __testStartStep={5} />);
    const emailInput = screen.getByLabelText(/e-mail/i);
    await user.type(emailInput, "nao-e-email");
    const next = screen.getByRole("button", {
      name: /criar|finalizar|salvar/i,
    }) as HTMLButtonElement;
    expect(next.disabled).toBe(true);
  });

  it("form admin: senha curta bloqueia Avançar", async () => {
    const user = userEvent.setup();
    renderWithProviders(<OnboardingWizard __testStartStep={5} />);
    await user.type(screen.getByLabelText(/e-mail/i), "admin@examplo.com");
    await user.type(screen.getByLabelText(/^senha$/i), "curta");
    const next = screen.getByRole("button", {
      name: /criar|finalizar|salvar/i,
    }) as HTMLButtonElement;
    expect(next.disabled).toBe(true);
  });

  it("form admin: confirmação diferente bloqueia Avançar", async () => {
    const user = userEvent.setup();
    renderWithProviders(<OnboardingWizard __testStartStep={5} />);
    await user.type(screen.getByLabelText(/e-mail/i), "admin@examplo.com");
    await user.type(screen.getByLabelText(/^senha$/i), "SenhaForte123");
    await user.type(
      screen.getByLabelText(/confirmar|confirma/i),
      "SenhaDiferente",
    );
    const next = screen.getByRole("button", {
      name: /criar|finalizar|salvar/i,
    }) as HTMLButtonElement;
    expect(next.disabled).toBe(true);
  });

  it("sucesso → tela 'Concluído' (passo 6)", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      if (url.endsWith("/create-admin")) {
        return new Response(JSON.stringify({ ok: true, userId: "u-1" }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    // Pré-popula credenciais do projeto novo (vindas do passo 4).
    storeProgress({
      completedSteps: ["create-project"],
      functions: [],
      projectRef: "ref-final",
      startedAt: 1,
      updatedAt: 2,
    });

    renderWithProviders(
      <OnboardingWizard
        __testStartStep={5}
        __testSeed={{
          projectRef: "ref-final",
          serviceRoleKey: "svc-role-key",
        }}
      />,
    );

    await user.type(screen.getByLabelText(/e-mail/i), "admin@examplo.com");
    await user.type(screen.getByLabelText(/^senha$/i), "SenhaForte123");
    await user.type(
      screen.getByLabelText(/confirmar|confirma/i),
      "SenhaForte123",
    );
    await user.click(
      screen.getByRole("button", { name: /criar|finalizar|salvar/i }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/installer/create-admin",
        expect.objectContaining({ method: "POST" }),
      );
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /conclu[ií]do|pronto/i }),
      ).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: /entrar/i })).toBeTruthy();
  });

  it("invalida o cache do status após criar admin", async () => {
    const user = userEvent.setup();
    setCachedInstallationStatus({ configured: false, reason: "no-admin" });
    expect(getCachedInstallationStatus()).not.toBeNull();

    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/create-admin")) {
        return new Response(JSON.stringify({ ok: true, userId: "u-1" }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    storeProgress({
      completedSteps: ["create-project"],
      functions: [],
      projectRef: "ref-final",
      startedAt: 1,
      updatedAt: 2,
    });

    renderWithProviders(
      <OnboardingWizard
        __testStartStep={5}
        __testSeed={{
          projectRef: "ref-final",
          serviceRoleKey: "svc-role-key",
        }}
      />,
    );

    await user.type(screen.getByLabelText(/e-mail/i), "admin@examplo.com");
    await user.type(screen.getByLabelText(/^senha$/i), "SenhaForte123");
    await user.type(
      screen.getByLabelText(/confirmar|confirma/i),
      "SenhaForte123",
    );
    await user.click(
      screen.getByRole("button", { name: /criar|finalizar|salvar/i }),
    );

    await waitFor(() => {
      expect(getCachedInstallationStatus()).toBeNull();
    });
  });

  it("erro do backend → mensagem PT-BR e permanece no passo admin", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/create-admin")) {
        return new Response(
          JSON.stringify({ error: "E-mail já cadastrado." }),
          { status: 400 },
        );
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    storeProgress({
      completedSteps: ["create-project"],
      functions: [],
      projectRef: "ref-err",
      startedAt: 1,
      updatedAt: 2,
    });

    renderWithProviders(
      <OnboardingWizard
        __testStartStep={5}
        __testSeed={{ projectRef: "ref-err", serviceRoleKey: "svc-role-key" }}
      />,
    );

    await user.type(screen.getByLabelText(/e-mail/i), "dup@examplo.com");
    await user.type(screen.getByLabelText(/^senha$/i), "SenhaForte123");
    await user.type(
      screen.getByLabelText(/confirmar|confirma/i),
      "SenhaForte123",
    );
    await user.click(
      screen.getByRole("button", { name: /criar|finalizar|salvar/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/e-mail j[aá] cadastrado/i)).toBeTruthy();
    });
    // Continua no passo admin.
    expect(
      screen.getByRole("button", { name: /criar|finalizar|salvar/i }),
    ).toBeTruthy();
  });
});
