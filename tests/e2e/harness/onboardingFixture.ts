/**
 * Fixture Playwright para os E2E do auto-instalador `/onboarding`.
 *
 * Esta fixture NÃO sobe o harness — o `playwright.config.ts` faz isso via
 * `webServer` (`npm run build && npx tsx tests/e2e/harness/server.ts`).
 * Aqui expomos:
 *  - `onboarding` no escopo do teste: objeto com controles do harness
 *    (reset, forçar partial, bloquear após 1º lote, ler estado, tokens).
 *  - `page.goto("/onboarding")` automático por default (configurável).
 *
 * Decisões:
 *  - Tokens válidos são lidos do harness via `GET /__e2e/state` (fonte única
 *    de verdade — nunca duplicar strings de token entre harness e teste).
 *  - Reset é chamado entre testes automaticamente (afterEach).
 */
/* eslint-disable react-hooks/rules-of-hooks -- Playwright fixture API exige um parâmetro chamado `use`; não é hook React. */

import { test as base, expect } from "@playwright/test";

interface HarnessSnapshot {
  vercel: {
    projects: Array<{ id: string; name: string }>;
    envVars: Record<string, Record<string, string>>;
    deploys: Array<{ id: string; projectId: string; state: string }>;
  };
  supabase: {
    organizations: Array<{ id: string; name: string }>;
    projects: Array<{
      id: string;
      ref: string;
      name: string;
      organization_id: string;
      status: string;
    }>;
    functions: Record<
      string,
      Array<{ id: string; name: string; slug: string; verify_jwt: boolean }>
    >;
    secrets: Record<string, Record<string, string>>;
    sqlQueries: Array<{ ref: string; query: string; rows: number }>;
  };
  installerProjectRef?: string;
  harness: {
    installationCompleted: boolean;
    forcePartial: boolean;
    blockAfterFirstBatch: boolean;
    runCallCount: number;
  };
  tokens: {
    valid: { vercel: string; supabase: string };
  };
  ver: number;
}

export interface OnboardingControls {
  /** Tokens válidos aceitos pelos fakes (fonte: harness). */
  validTokens: { vercel: string; supabase: string };
  /** Token inválido (string conhecida que o fake rejeita). */
  invalidTokens: { vercel: string; supabase: string };
  /** Reseta todos os fakes + estado do harness. */
  reset(): Promise<void>;
  /** Lê snapshot completo do estado dos fakes. */
  snapshot(): Promise<HarnessSnapshot>;
  /** Liga/desliga o modo force-partial (run sempre retorna partial sintético). */
  setForcePartial(value: boolean): Promise<void>;
  /**
   * Prepara o cenário de resume: cria projeto novo no fake + pré-deploya N
   * functions (nomes reais do manifesto) + liga forcePartial. O wizard
   * recebe partial real e fica preso até o teste desligar forcePartial.
   */
  setupResumeScenario(preDeployCount?: number): Promise<void>;
  /** Liga/desliga a flag installationCompleted (status responde configured:true). */
  setInstallationCompleted(value: boolean): Promise<void>;
  /** Dispara o evento custom `onboarding:seed` para injetar dados no wizard. */
  seedWizardData(
    page: import("@playwright/test").Page,
    patch: Record<string, unknown>,
  ): Promise<void>;
}

export const test = base.extend<{ onboarding: OnboardingControls }>({
  onboarding: async ({ request }, use) => {
    const baseUrl = `http://127.0.0.1:${process.env.HARNESS_PORT ?? "4173"}`;

    async function post(action: string, extra: Record<string, unknown> = {}) {
      const res = await request.post(`${baseUrl}/__e2e/control`, {
        data: { action, ...extra },
        timeout: 10_000,
      });
      expect(res.ok(), `controle ${action} falhou`).toBeTruthy();
    }

    const initial = await request.get(`${baseUrl}/__e2e/state`, {
      timeout: 10_000,
    });
    const initialJson = (await initial.json()) as HarnessSnapshot;

    const controls: OnboardingControls = {
      validTokens: initialJson.tokens.valid,
      invalidTokens: {
        vercel: "token-invalido-vercel-xxx",
        supabase: "token-invalido-supabase-xxx",
      },
      reset: () => post("reset"),
      snapshot: async () => {
        const res = await request.get(`${baseUrl}/__e2e/state`, {
          timeout: 10_000,
        });
        return (await res.json()) as HarnessSnapshot;
      },
      setForcePartial: (value) => post("set-force-partial", { value }),
      setupResumeScenario: (preDeployCount = 10) =>
        post("setup-resume-scenario", { count: preDeployCount }),
      setInstallationCompleted: (value) =>
        post("set-installation-completed", { value }),
      seedWizardData: async (page, patch) => {
        await page.evaluate((data) => {
          window.dispatchEvent(
            new CustomEvent("onboarding:seed", { detail: data }),
          );
        }, patch);
      },
    };

    // Reset antes de cada teste — isolamento total.
    await controls.reset();

    await use(controls);

    // Reset ao final também (limpeza defensiva).
    await controls.reset();
  },
});

export const expect2 = expect;
export { expect };
