/**
 * Task 3.3.3 — Token inválido com mensagem PT-BR e bloqueio de avanço.
 *
 * Cenário:
 *  1. Passo 1 (Vercel): cola token inválido → clica "Validar" → mensagem
 *     PT-BR aparece e o botão "Avançar" permanece desabilitado.
 *  2. Corrige o token para válido → valida → "Avançar" habilita.
 *
 * O handler `validate-tokens` real é exercitado contra o fake (que devolve
 * 401 para tokens não-autorizados), então o teste valida também o caminho
 * do wrapper (`_lib/vercel-api.ts`) e a tradução para mensagem PT-BR.
 */

import { test, expect } from "./harness/onboardingFixture";
import {
  passWelcome,
  passVercelToken,
  clickNext,
} from "./harness/wizardHelpers";

test.describe("Token inválido — mensagem PT-BR e bloqueio", () => {
  test("token da Vercel inválido bloqueia avanço e prossegue ao corrigir", async ({
    page,
    onboarding,
  }) => {
    const { validTokens, invalidTokens } = onboarding;

    await page.goto("/onboarding");
    await passWelcome(page);

    // --- Cola token INVÁLIDO e valida ---
    await passVercelToken(page, invalidTokens.vercel);

    // Mensagem PT-BR aparece (role=alert).
    await expect(
      page.getByText(/token da vercel inv[aá]lido/i).first(),
    ).toBeVisible({ timeout: 5000 });

    // Botão "Avançar" desabilitado.
    const avancarBtn = page.getByRole("button", { name: /avançar/i });
    await expect(avancarBtn).toBeDisabled();

    // --- Corrige o token para VÁLIDO ---
    const tokenInput = page.getByLabel(/token da vercel/i);
    // Limpa e cola o token válido. Usar fill() dispara o onChange que
    // reseta o estado de validação no TokenStepShared.
    await tokenInput.fill("");
    await tokenInput.fill(validTokens.vercel);
    await page.getByRole("button", { name: /^validar$/i }).click();

    // Confirmação PT-BR aparece.
    await expect(page.getByText(/token da vercel confirmado/i)).toBeVisible({
      timeout: 5000,
    });

    // Botão "Avançar" agora habilitado — clica e chega no passo Supabase.
    await expect(avancarBtn).toBeEnabled();
    await clickNext(page);
    await expect(page.getByText(/token do supabase/i).first()).toBeVisible();
  });

  test("token do Supabase inválido também bloqueia (validação cruzada)", async ({
    page,
    onboarding,
  }) => {
    const { validTokens, invalidTokens } = onboarding;

    await page.goto("/onboarding");
    await passWelcome(page);

    // Passa pelo Vercel primeiro.
    await passVercelToken(page, validTokens.vercel);
    await expect(page.getByText(/token da vercel confirmado/i)).toBeVisible({
      timeout: 5000,
    });
    await clickNext(page);

    // --- Token do Supabase INVÁLIDO ---
    await page.getByLabel(/token do supabase/i).fill(invalidTokens.supabase);
    await page.getByRole("button", { name: /^validar$/i }).click();

    await expect(
      page.getByText(/token do supabase inv[aá]lido/i).first(),
    ).toBeVisible({ timeout: 5000 });

    const avancarBtn = page.getByRole("button", { name: /avançar/i });
    await expect(avancarBtn).toBeDisabled();
  });
});
