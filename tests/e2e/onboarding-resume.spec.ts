/**
 * Task 3.3.2 — Resume da instalação sem re-deployar functions.
 *
 * Cenário orquestrado:
 *  1. `setupResumeScenario(10)` (harness): cria um projeto novo no fake de
 *     Supabase Management + pré-deploya 10 functions com NOMES REAIS do
 *     manifesto (`add-existing-user`, ...) + liga `forcePartial`.
 *  2. Caminhamos o wizard até o passo 4 (Instalando). O wizard dispara `run`
 *     e recebe um PARTIAL SINTÉTICO usando o estado atual do fake (progress
 *     com projectRef e 10 functions). Persiste o progress em sessionStorage
 *     e fica preso no ciclo de auto-resume (parcial → reinvoca → ...).
 *  3. **Recarregamos a página** (simula interrupção real do usuário).
 *  4. Caminhamos o wizard de novo até o passo 4. O InstallingStep lê o
 *     `progress` do `sessionStorage` no mount (`useRef(loadStoredProgress())`)
 *     e o reenvia no body do próximo `run`. Tokens precisam ser re-colados
 *     (são efêmeros — não persistem, por design).
 *  5. `setForcePartial(false)` → a próxima chamada roda o handler REAL. O
 *     orquestrador filtra `pending = manifest.filter(!isFunctionDeployed)`
 *     e deploya SOMENTE as (232-10)=222 functions ainda ausentes. Conclui.
 *
 * Asserção:
 *  - Total de deploys no fake (`state.functions[ref].length`) é exatamente
 *    232 (cada function deployada uma única vez). Se o resume estivesse
 *    quebrado (re-deployando tudo), o número seria > 232.
 */

import { test, expect } from "./harness/onboardingFixture";
import {
  passWelcome,
  passVercelToken,
  passSupabaseToken,
  clickNext,
  passOrgProject,
} from "./harness/wizardHelpers";

/** Caminha o wizard do passo 0 até montar no passo 4 (Instalando). */
async function walkToInstalling(
  page: import("@playwright/test").Page,
  validTokens: { vercel: string; supabase: string },
  projectName: string,
): Promise<void> {
  await passWelcome(page);
  await passVercelToken(page, validTokens.vercel);
  await expect(
    page.getByText(/token da vercel confirmado/i).first(),
  ).toBeVisible({
    timeout: 5000,
  });
  await clickNext(page);
  await passSupabaseToken(page, validTokens.supabase);
  await expect(
    page.getByText(/token do supabase confirmado/i).first(),
  ).toBeVisible({
    timeout: 5000,
  });
  await clickNext(page);
  await expect(
    page.getByRole("heading", { name: /organização e projeto/i }),
  ).toBeVisible();
  await expect(page.getByText(/organização e2e/i).first()).toBeVisible({
    timeout: 5000,
  });
  await passOrgProject(page, projectName);
  await expect(
    page.getByRole("heading", { name: /^instalando$/i }),
  ).toBeVisible();
}

test.describe("Resume — instalação retoma sem re-deployar", () => {
  test("após recarregar, retoma e conclui sem duplicar deploys", async ({
    page,
    onboarding,
  }) => {
    const { validTokens } = onboarding;

    // Pré-condição: projeto + 10 functions já deployadas + forcePartial ON.
    await onboarding.setupResumeScenario(10);

    // --- 1ª sessão: caminha até o passo Instalando ---
    await page.goto("/onboarding");
    await walkToInstalling(page, validTokens, "expx-resume");

    // Wizard dispara run e fica preso no ciclo de partials.
    await expect
      .poll(
        async () => {
          const snap = await onboarding.snapshot();
          return snap.installerProjectRef;
        },
        { timeout: 30_000, intervals: [300] },
      )
      .toBeTruthy();

    const beforeReload = await onboarding.snapshot();
    const ref = beforeReload.installerProjectRef!;
    const countBefore = (beforeReload.supabase.functions[ref] ?? []).length;
    expect(countBefore, "10 functions pré-deployadas pelo setup").toBe(10);

    const runCountBefore = beforeReload.harness.runCallCount;
    expect(
      runCountBefore,
      "wizard fez pelo menos 1 chamada run",
    ).toBeGreaterThan(0);

    // --- Recarrega a página (simula interrupção) ---
    await page.reload();

    // --- 2ª sessão: caminha de novo até o passo Instalando ---
    // Os tokens são efêmeros (não persistem) — precisam ser re-colados.
    // O progress do instalador É persistido em sessionStorage e é lido pelo
    // InstallingStep no mount, então o "resume" acontece automaticamente.
    await walkToInstalling(page, validTokens, "expx-resume");

    // Confirmamos que o wizard fez nova chamada run após reload (resume).
    await expect
      .poll(
        async () => {
          const snap = await onboarding.snapshot();
          return snap.harness.runCallCount;
        },
        { timeout: 15_000, intervals: [300] },
      )
      .toBeGreaterThan(runCountBefore);

    // --- Desliga forcePartial: handler real roda e conclui ---
    await onboarding.setForcePartial(false);

    // Aguarda a barra chegar a 100%.
    await expect(page.locator("[role='progressbar']")).toHaveAttribute(
      "aria-valuenow",
      "100",
      { timeout: 90_000 },
    );

    // Espera o passo admin aparecer (instalação concluiu).
    await expect(
      page.getByRole("heading", { name: /criar administrador/i }),
    ).toBeVisible({ timeout: 15_000 });

    // ----- Asserção principal: nenhuma function foi re-deployada -----
    const finalSnap = await onboarding.snapshot();
    const finalRef = finalSnap.installerProjectRef;
    expect(finalRef, "projeto mantido após resume").toBe(ref);
    const fns = finalSnap.supabase.functions[finalRef!] ?? [];
    expect(
      fns.length,
      "total de deploys no fake === tamanho do manifesto (sem duplicatas)",
    ).toBe(232);

    // Sanity check: nenhuma function com nome duplicado no estado do fake.
    const names = fns.map((f) => f.name);
    const unique = new Set(names);
    expect(unique.size, "sem duplicação de nome de function").toBe(
      names.length,
    );
  });
});
