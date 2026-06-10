# Rules — Testing (escopo: agente testing)

Aplicam-se a qualquer trabalho de testes. Carregar junto com `.claude/rules/global.md`.

1. **Runner**: Vitest (`npm run test` em watch, `npm run test:ci` para rodar uma vez). Testes novos seguem a skill `write-test`.
2. **Mocks obrigatórios**: Supabase client, `useAuth`, `CompanyContext` e Sonner devem ser mockados — nunca bater no banco real em teste.
3. **QueryClient de teste**: sempre criado com `retry: false`.
4. **Providers**: componente sob teste deve ser envolvido com QueryClientProvider + BrowserRouter (+ contexts necessários).
5. **Comportamento, não implementação**: assertions verificam o que o usuário vê/faz, não detalhes internos.
6. **Nomes em PT-BR**: descrições de teste descrevem o comportamento esperado em Português.
7. **Teste acompanha correção**: Toda correção de bug deve incluir um teste que reproduz o bug (falha antes, passa depois), quando o alvo for testável com a infra atual.
