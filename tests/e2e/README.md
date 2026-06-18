# Playwright E2E

Specs do Playwright ficam em `tests/e2e/**/*.spec.ts` e rodam via `npm run test:e2e`.

Os fakes das APIs externas (Vercel API + Supabase Management API) vivem em
`tests/e2e/fakes/` e são servidores HTTP reais (`node:http`) reutilizáveis tanto
em testes unitários (Vitest, projeto `node`) quanto em specs E2E (Playwright).
