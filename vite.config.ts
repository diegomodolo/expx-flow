/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import commonjs from "vite-plugin-commonjs";
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [commonjs(), react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    // Exclusões comuns herdadas por todos os projetos.
    // - supabase/functions/** são Edge Functions Deno (rodamos com `deno test`).
    // - tests/e2e/**/*.spec.ts são specs do Playwright (rodamos com `playwright test`).
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/supabase/functions/**",
      "tests/e2e/**/*.spec.ts",
    ],
    // Vitest 4: cada "project" isola ambiente e escopo de arquivos.
    // - browser: jsdom para src/** (componentes, hooks, pages com DOM/React).
    // - node: node para api/**, scripts/** e tests/** (código server, fakes HTTP).
    projects: [
      {
        extends: true,
        test: {
          name: "browser",
          environment: "jsdom",
          setupFiles: "./src/test/setup.ts",
          css: true,
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
        },
      },
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: [
            "api/**/*.{test,spec}.{ts,tsx}",
            "scripts/**/*.{test,spec}.{ts,tsx,js,mjs}",
            "tests/**/*.{test,spec}.{ts,tsx}",
          ],
        },
      },
    ],
  },
}));
