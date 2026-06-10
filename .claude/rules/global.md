# Rules Globais — Expx Flow

Regras invioláveis que se aplicam a TODOS os agentes e a qualquer trabalho no projeto. Cada agente DEVE carregar este arquivo antes de trabalhar, junto com sua rule escopada em `.claude/rules/<escopo>.md`.

## Dados e Multi-tenancy

1. **company_id**: SEMPRE usar `activeCompany.company_id` para queries. NUNCA `activeCompany.id` (este é o ID do registro em `company_members`). Usar `.id` causa dados inseridos com company_id errado e queries retornando 0 resultados.
2. **types.ts é auto-gerado**: `src/integrations/supabase/types.ts` NUNCA é editado manualmente. Regenerar via CLI do Supabase.

## Código

3. **Idioma PT-BR**: Todos os textos de UI, toasts, nomes de rotas e mensagens visíveis ao usuário em Português.
4. **Path alias**: Imports sempre com `@/` (nunca caminhos relativos `../../../`).
5. **shadcn/ui**: Componentes em `src/components/ui/` são primitivos gerados por CLI — nunca editar diretamente. Novos primitivos via `npx shadcn-ui@latest add <componente>`.

## Fluxo de trabalho

6. **Fail-fast**: Testes, lint ou build quebrados bloqueiam qualquer commit. Nunca commitar código quebrado na main.
7. **Sem --no-verify**: Hooks do husky fazem parte do pipeline. Nunca pular.
8. **Sem force push**: Em hipótese alguma.
9. **Commit + push ao final**: Todo trabalho finalizado deve ser commitado e enviado para a main (deploy automático na Vercel).
10. **Skill de contexto**: Ao finalizar feature/módulo, criar ou atualizar a skill de contexto em `.claude/skills/<modulo>/SKILL.md`.

## Delegação

11. **Trabalho multi-etapa passa pelo orquestrador**: Os commands do projeto delegam ao agente `orquestrador`, que decompõe e distribui para os agentes especializados. Agentes especializados não delegam entre si — reportam ao orquestrador.
