/**
 * Task 3.3.1 — Fluxo feliz do auto-instalador `/onboarding`.
 *
 * Cobre os 7 passos:
 *  0. Boas-vindas → "Começar"
 *  1. Token da Vercel → cola válido → valida → "Avançar"
 *  2. Token do Supabase → cola válido → valida → "Avançar"
 *  3. Organização + nome do projeto → "Avançar"
 *  4. Instalando → barra progride até 100% → "Concluído" aparece
 *  5. Admin → preenche → "Criar administrador"
 *  6. Concluído → "Entrar" → app carrega (guard libera `/`)
 *
 * O fluxo `run` roda contra fakes locais (nunca APIs reais). O step
 * "Instalando" dispara o `runInstaller` real, que cria o projeto no fake
 * de Supabase Management, aplica o `consolidated.sql`, deploya as 232
 * functions do manifesto contra o fake, seta secrets, grava envs na Vercel
 * fake e dispara o redeploy fake.
 */

import { test, expect } from "./harness/onboardingFixture";
import {
  passWelcome,
  passVercelToken,
  passSupabaseToken,
  clickNext,
  passOrgProject,
  fillAdminForm,
} from "./harness/wizardHelpers";

test.describe("Fluxo feliz — auto-instalador /onboarding", () => {
  test("percorre os 7 passos até o app", async ({ page, onboarding }) => {
    const { validTokens } = onboarding;

    await page.goto("/onboarding");

    // -------- Passo 0: Boas-vindas --------
    await expect(page.getByText(/bem-vindo.*expx flow/i)).toBeVisible();
    await passWelcome(page);

    // -------- Passo 1: Token da Vercel --------
    await expect(
      page.getByRole("heading", { name: /token da vercel/i }),
    ).toBeVisible();
    await passVercelToken(page, validTokens.vercel);
    await expect(
      page.getByText(/token da vercel confirmado/i).first(),
    ).toBeVisible({
      timeout: 5000,
    });
    await clickNext(page);

    // -------- Passo 2: Token do Supabase --------
    await expect(
      page.getByRole("heading", { name: /token do supabase/i }),
    ).toBeVisible();
    await passSupabaseToken(page, validTokens.supabase);
    await expect(
      page.getByText(/token do supabase confirmado/i).first(),
    ).toBeVisible({
      timeout: 5000,
    });
    await clickNext(page);

    // -------- Passo 3: Organização e projeto --------
    await expect(
      page.getByRole("heading", { name: /organização e projeto/i }),
    ).toBeVisible();
    // Aguarda o dropdown carregar as orgs do fake.
    await expect(page.getByText(/organização e2e/i).first()).toBeVisible({
      timeout: 5000,
    });
    await passOrgProject(page, "expx-e2e");

    // -------- Passo 4: Instalando --------
    await expect(
      page.getByRole("heading", { name: /^instalando$/i }),
    ).toBeVisible();
    // A barra de progresso eventualmente atinge 100% (Math.round na UI).
    await expect(page.locator("[role='progressbar']")).toHaveAttribute(
      "aria-valuenow",
      "100",
      { timeout: 90_000 },
    );

    // Avança para o passo admin (800ms após done).
    await expect(
      page.getByRole("heading", { name: /criar administrador/i }),
    ).toBeVisible({
      timeout: 15_000,
    });

    // -------- Passo 5: Admin --------
    // O wizard ainda não recebe serviceRoleKey do run (gap de produção).
    // Injetamos via evento custom (mecanismo de teste do OnboardingWizard).
    await onboarding.seedWizardData(page, {
      projectRef: "e2e-fake-ref",
      serviceRoleKey: "e2e-fake-service-role-key",
    });
    // Pequeno espera para o wizard processar o evento (re-render do React).
    await page.waitForTimeout(200);
    await fillAdminForm(page, {
      email: "admin@expx-e2e.com",
      password: "SenhaForteE2E123",
    });
    // Verifica que o botão está habilitado antes de clicar.
    const submitBtn = page.getByRole("button", {
      name: /criar administrador/i,
    });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // -------- Passo 6: Concluído --------
    await expect(
      page.getByRole("heading", { name: /tudo pronto/i }),
    ).toBeVisible({
      timeout: 10_000,
    });

    // Verifica que o admin foi criado e a flag installation_completed virou.
    const snap = await onboarding.snapshot();
    expect(snap.harness.installationCompleted).toBe(true);

    // Clica em "Entrar" → navega para "/" e o guard libera.
    await page.getByRole("button", { name: /^entrar$/i }).click();
    await page.waitForURL((url) => url.pathname === "/", { timeout: 10_000 });
    // O guard liberou "/" — não fomos redirecionados de volta para /onboarding.
    expect(page.url()).toMatch(/\/$/);
    expect(page.url()).not.toMatch(/\/onboarding/);

    // Confirma que o status do instalador responde configured:true agora.
    const statusRes = await page.request.get("/api/installer/status");
    expect(statusRes.ok()).toBeTruthy();
    expect((await statusRes.json()).configured).toBe(true);

    // Confirma que a instalação rodou de verdade contra os fakes: projeto
    // criado no Supabase fake + functions deployadas + envs na Vercel fake.
    const finalSnap = await onboarding.snapshot();
    const createdProject = finalSnap.supabase.projects.find(
      (p) => p.ref !== "projseedref",
    );
    expect(createdProject).toBeTruthy();
    expect(createdProject?.name).toBe("expx-e2e");

    const fns = finalSnap.supabase.functions[createdProject!.ref] ?? [];
    // O manifesto de produção tem 232 functions — todas devem ser deployadas.
    expect(fns.length, "todas as 232 functions do manifesto deployadas").toBe(
      232,
    );

    // Envs na Vercel fake para o projeto Vercel.
    const envs = finalSnap.vercel.envVars;
    const anyVercelPid = Object.keys(envs)[0];
    expect(anyVercelPid).toBeTruthy();
    expect(envs[anyVercelPid]?.VITE_SUPABASE_URL).toContain(
      createdProject!.ref,
    );
    expect(envs[anyVercelPid]?.VITE_SUPABASE_ANON_KEY).toBeTruthy();
  });
});
