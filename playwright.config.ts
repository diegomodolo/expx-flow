import { defineConfig, devices } from "@playwright/test";

//
// Configuração do Playwright para o auto-instalador /onboarding.
//
// - Specs: tests/e2e/ (arquivos *.spec.ts)
// - Browser: apenas chromium (CI enxuto)
// - baseURL configurável via PLAYWRIGHT_BASE_URL (default http://localhost:4173)
// - webServer: sobe o harness E2E (`tests/e2e/harness/server.ts`) via tsx na
//   porta 4173. O harness builda o frontend antes (`npm run build`) e então
//   serve o `dist/` + os handlers reais `/api/installer/*` (contra os fakes
//   de Vercel/Supabase) no MESMO origin — o wizard no browser chama as rotas
//   relativas `/api/installer/*` e tudo bate no harness. Para rodar contra
//   um harness já ativo sem que o Playwright suba outro, defina
//   PLAYWRIGHT_NO_SERVER=1.
//
// Os fakes das APIs externas (Vercel/Supabase Management) são subidos DENTRO
// do harness (não pelos próprios specs), porque handlers e fakes precisam
// compartilhar o mesmo processo (os handlers leem URLs dos fakes via env).
//
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;
const noServer = process.env.PLAYWRIGHT_NO_SERVER === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false, // harness tem estado global — serializa para evitar corrida
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1, // 1 worker: harness compartilhado entre specs
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 60_000,
  use: {
    baseURL,
    trace: "on-first-retry",
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  ...(noServer
    ? {}
    : {
        webServer: {
          command: "npm run build && npx tsx tests/e2e/harness/server.ts",
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
          env: {
            HARNESS_PORT: String(port),
            HARNESS_HOST: "127.0.0.1",
          },
        },
      }),
});
