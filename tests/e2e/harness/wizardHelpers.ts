/**
 * Helpers Playwright reutilizáveis pelos specs E2E do `/onboarding`.
 *
 * Seletores preferem `getByRole`/`getByLabel`/`getByText` em PT-BR,
 * conforme as rules do projeto.
 */

import type { Page, Locator } from "@playwright/test";

/** Passo 0: Boas-vindas → clica em "Começar". */
export async function passWelcome(page: Page): Promise<void> {
  await page.getByRole("button", { name: /começar/i }).click();
}

/**
 * Passo 1: Token da Vercel. Credenciais controladas pela fixture.
 * Por default cola o token válido e valida.
 */
export async function passVercelToken(
  page: Page,
  token: string,
): Promise<void> {
  await page.getByLabel(/token da vercel/i).fill(token);
  await page.getByRole("button", { name: /^validar$/i }).click();
}

/** Passo 2: Token do Supabase. */
export async function passSupabaseToken(
  page: Page,
  token: string,
): Promise<void> {
  await page.getByLabel(/token do supabase/i).fill(token);
  await page.getByRole("button", { name: /^validar$/i }).click();
}

/**
 * Passo 1 → 2 (avança depois de validado o token da Vercel).
 * Verifica que o botão Avançar está habilitado antes de clicar.
 */
export async function clickNext(page: Page): Promise<void> {
  await page.getByRole("button", { name: /avançar/i }).click();
}

/** Passo 3: Organização e projeto. Clica em Avançar (org pré-selecionada). */
export async function passOrgProject(
  page: Page,
  projectName = "expx-e2e",
): Promise<void> {
  // Sobrescreve o nome default.
  const nameInput = page.getByLabel(/nome do projeto/i);
  await nameInput.fill("");
  await nameInput.fill(projectName);
  await page.getByRole("button", { name: /avançar/i }).click();
}

/** Instância do card do wizard (para checar o passo atual). */
export function wizardCard(page: Page): Locator {
  return page.locator("[data-testid='onboarding-step-indicator']");
}

/** Texto "Passo N de 7". */
export async function getStepIndicator(page: Page): Promise<string> {
  return (await wizardCard(page).textContent()) ?? "";
}

/**
 * Cola tokens válidos nos passos 1 e 2, validando cada um, e chega no passo 3.
 * Reutilizado pelos cenários que precisam passar direto pela parte de tokens.
 */
export async function fillValidTokensAndReachOrgStep(
  page: Page,
  validTokens: { vercel: string; supabase: string },
): Promise<void> {
  await passWelcome(page);
  await passVercelToken(page, validTokens.vercel);
  // Confirma que validou antes de avançar.
  await page
    .getByText(/token da vercel confirmado/i)
    .waitFor({ timeout: 5000 });
  await clickNext(page);

  await passSupabaseToken(page, validTokens.supabase);
  await page
    .getByText(/token do supabase confirmado/i)
    .waitFor({ timeout: 5000 });
  await clickNext(page);
}

/**
 * Passo do admin: preenche email/senha/confirmar e submete.
 * Retorna o locator do formulário para checagens adicionais.
 */
export async function fillAdminForm(
  page: Page,
  opts: { email?: string; password?: string } = {},
): Promise<void> {
  const email = opts.email ?? "admin-e2e@expxflow.com";
  const password = opts.password ?? "SenhaForteE2E123";
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/^senha$/i).fill(password);
  await page.getByLabel(/confirmar|confirma/i).fill(password);
}

/**
 * Espera helper: a flag installationCompleted ficar true no harness.
 * Confirma que o fluxo realmente concluiu no backend.
 */
export async function waitForInstallationFlag(
  snapshot: () => Promise<{ harness: { installationCompleted: boolean } }>,
  timeoutMs = 15_000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const s = await snapshot();
    if (s.harness.installationCompleted) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(
    "installationCompleted não virou true no harness dentro do tempo limite.",
  );
}
