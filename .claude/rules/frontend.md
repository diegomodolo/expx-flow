# Rules — Frontend (escopo: agente frontend)

Aplicam-se a qualquer trabalho em `src/` (componentes, páginas, hooks, contexts). Carregar junto com `.claude/rules/global.md`.

1. **DashboardLayout obrigatório**: Toda página protegida DEVE ser envolvida com `<DashboardLayout>` (sidebar + header). Sem exceção. Referência: `AlertasDoSistema.tsx`.
2. **React Query**: Data fetching em hooks `use<Entidade><Acao>` com `useQuery`/`useMutation`. Sempre configurar `enabled: !!dependencia` e invalidar cache com `queryClient.invalidateQueries()` após mutations.
3. **Toasts via Sonner**: `toast.success()` / `toast.error()`, sempre em PT-BR.
4. **Classes condicionais**: usar `cn()` de `@/lib/utils`, nunca template strings manuais.
5. **Forms**: React Hook Form + Zod schemas. Nunca formulários com estado manual.
6. **Playbooks**: Para criar página nova usar a skill `new-page`; componente novo usar `new-component`; teste novo usar `write-test`. Não inventar estrutura própria.
7. **Dados não aparecem**: Antes de mexer no código, rodar o diagnóstico da skill `debug-data` (RLS, GRANT, company_id).
