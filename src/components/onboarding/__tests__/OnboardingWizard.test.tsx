import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import {
  clearStoredProgress,
  ONBOARDING_PROGRESS_KEY,
} from "@/components/onboarding/onboardingState";

/**
 * Task 3.1.1 — Estrutura e navegação do wizard (RED).
 * Valida o esqueleto: 7 passos, navegação Começar/Voltar/Avançar,
 * bloqueio de avanço com campo obrigatório vazio.
 */

function reset() {
  clearStoredProgress();
  sessionStorage.removeItem(ONBOARDING_PROGRESS_KEY);
}

describe("OnboardingWizard — estrutura e navegação", () => {
  beforeEach(() => {
    reset();
    vi.restoreAllMocks();
  });

  it("inicia no passo de boas-vindas (0)", () => {
    renderWithProviders(<OnboardingWizard />);
    expect(
      screen.getByRole("heading", {
        name: /bem-vindo|boas-vindas|configura[çc][ãa]o inicial/i,
      }),
    ).toBeTruthy();
  });

  it('"Começar" avança do passo 0 para o passo 1 (token da Vercel)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OnboardingWizard />);
    await user.click(screen.getByRole("button", { name: /^começar$/i }));
    await waitFor(() => {
      expect(
        screen.getByRole("link", {
          name: /vercel\.com\/account\/tokens/i,
        }),
      ).toBeTruthy();
    });
  });

  it("bloqueia o avanço quando campo obrigatório está vazio (passo 1)", async () => {
    const user = userEvent.setup();
    renderWithProviders(<OnboardingWizard />);
    await user.click(screen.getByRole("button", { name: /^começar$/i }));
    // Espera o passo 1 montar (link da Vercel aparece).
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /vercel\.com\/account\/tokens/i }),
      ).toBeTruthy(),
    );
    // Token input vazio → botão "Avançar" desabilitado.
    const nextButton = screen.getByRole("button", {
      name: /avançar|próximo/i,
    }) as HTMLButtonElement;
    expect(nextButton.disabled).toBe(true);
  });

  it('"Voltar" retorna ao passo anterior (1 → 0)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OnboardingWizard />);
    await user.click(screen.getByRole("button", { name: /^começar$/i }));
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /vercel\.com\/account\/tokens/i }),
      ).toBeTruthy(),
    );
    await user.click(screen.getByRole("button", { name: /voltar/i }));
    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: /bem-vindo|boas-vindas|configura[çc][ãa]o inicial/i,
        }),
      ).toBeTruthy();
    });
  });

  it("permite chegar ao último passo (concluído) via estado inicial de teste", async () => {
    // Para testar a navegação completa sem APIs externas, expomos uma prop
    // `__testStartStep` que pula o estado inicial. O componente real não a usa.
    const user = userEvent.setup();
    renderWithProviders(<OnboardingWizard __testStartStep={6} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /entrar/i })).toBeTruthy();
    });
  });

  it("mostra indicador de progresso (passo atual/total)", async () => {
    renderWithProviders(<OnboardingWizard />);
    // Indicador tipo "Passo 1 de 7" ou similar.
    expect(screen.getByText(/1\s*(\/|de)\s*7/i)).toBeTruthy();
  });

  it("não quebra o estado quando se clica em Voltar no passo 0 (esconde o botão)", () => {
    renderWithProviders(<OnboardingWizard />);
    // No passo 0 não deve haver botão Voltar.
    const back = screen.queryByRole("button", { name: /voltar/i });
    expect(back).toBeNull();
  });
});

/**
 * Helper para forçar montagem em um passo específico — usado apenas em teste
 * para encurtar o caminho sem chamar APIs.
 */
export {};

// marca act como usada para evitar warning de import não utilizado
void act;
