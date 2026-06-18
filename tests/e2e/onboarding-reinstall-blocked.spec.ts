/**
 * Task 3.3.4 — Reinstalação bloqueada.
 *
 * Cenário:
 *  1. Liga `installationCompleted` no harness (simula `system_config_app.
 *     installation_completed = true`). A partir daqui:
 *      • `GET /api/installer/status` retorna `{ configured: true }`.
 *      • `/api/installer/run` com `progress` completo retorna 409 (handler
 *        real).
 *      • Acessar `/onboarding` no browser → `InstallationGuard` redireciona
 *        para `/`.
 *
 * Decisão sobre o 409: o handler real (`api/installer/run.ts`) checa
 * `isFullyDone(body.progress)` e rejeita com 409. Simulamos um `progress`
 * completo (todos os steps) no body para acionar esse caminho — sem precisar
 * de um `isAlreadyCompleted` externo.
 */

import { test, expect } from "./harness/onboardingFixture";

test.describe("Reinstalação bloqueada — installation_completed=true", () => {
  test("acessar /onboarding redireciona para /", async ({
    page,
    onboarding,
  }) => {
    await onboarding.setInstallationCompleted(true);

    // Tenta acessar /onboarding — o guard redireciona para /.
    await page.goto("/onboarding");
    await page.waitForURL((url) => url.pathname === "/", { timeout: 10_000 });
    expect(page.url()).toMatch(/\/$/);
    expect(page.url()).not.toMatch(/\/onboarding/);
  });

  test("chamada direta a /api/installer/run com progress completo → 409", async ({
    request,
    onboarding,
  }) => {
    await onboarding.setInstallationCompleted(true);

    const allSteps = [
      "create-project",
      "apply-schema",
      "deploy-functions",
      "set-secrets",
      "write-vercel-env",
      "trigger-redeploy",
    ];

    const res = await request.post("/api/installer/run", {
      headers: { "Content-Type": "application/json" },
      data: {
        vercelToken: onboarding.validTokens.vercel,
        supabaseToken: onboarding.validTokens.supabase,
        options: {
          orgId: "org_e2e",
          projectName: "expx-blocked",
          dbPassword: "DbBlocked123!",
        },
        progress: {
          completedSteps: allSteps,
          functions: ["a", "b"],
          projectRef: "projseedref",
          projectAnonKey: "anon-x",
          vercelProjectId: "prj_e2e",
          startedAt: Date.now(),
          updatedAt: Date.now(),
        },
        reinstall: false,
      },
      maxRedirects: 0,
      timeout: 15_000,
    });

    expect(res.status(), "POST /run com progress completo → 409").toBe(409);
    const body = await res.json().catch(() => ({}));
    expect(body.error ?? "").toMatch(/j[aá] conclu[ií]da|reinstall/i);
  });

  test("com installationCompleted=false, /onboarding permanece acessível", async ({
    page,
    onboarding,
  }) => {
    // (sanity check contrário) — instalação NÃO concluída → onboarding liberado.
    await onboarding.setInstallationCompleted(false);
    await page.goto("/onboarding");
    // Continua em /onboarding e mostra o wizard.
    await expect(page.getByText(/bem-vindo.*expx flow/i)).toBeVisible({
      timeout: 10_000,
    });
    expect(page.url()).toMatch(/\/onboarding/);
  });
});
