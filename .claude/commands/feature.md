---
description: "Implementa uma feature nova de ponta a ponta: dados, permissoes, UI, testes e skill de contexto"
argument-hint: <descricao da feature>
---

# /feature

Feature solicitada: $ARGUMENTS

Delegue este trabalho ao agente `orquestrador` (via Task tool) com o briefing abaixo. Não implemente diretamente.

## Briefing para o orquestrador

Executar o fluxo **Feature nova** definido em `agents/orquestrador.md`:

1. Decompor a feature: precisa de tabela nova? Edge Function? permissão? página? componentes?
2. Se a decomposição revelar decisões de produto ambíguas (escopo, comportamento esperado), listar as premissas adotadas no relatório final.
3. Delegar em ordem de dependência, cada agente com `.claude/rules/global.md` + rule escopada:
   - `backend` — skill `new-table` (RLS SECURITY DEFINER + GRANT) e/ou `new-edge-function`
   - `auth` — skill `add-permission` (enum DB ANTES do frontend) se houver rota protegida nova
   - `frontend` — skills `new-page` (DashboardLayout obrigatório) e `new-component`
   - `testing` — skill `write-test` para hooks e componentes criados
4. Validação final com o agente `permissions` (consistência rotas × sidebar × MenuItemType).
5. Pipeline verde obrigatório: `npm run test:ci` + `npm run lint` + `npm run build`.
6. Criar skill de contexto do módulo em `.claude/skills/<modulo>/SKILL.md` (visão geral, arquivos-chave, padrões, armadilhas).

## Output esperado (PT-BR)

- Decomposição executada (o que foi criado em cada camada)
- Premissas adotadas
- Resultado do pipeline e da validação de permissões
- Skill de contexto criada
- Sugerir `/deploy` para publicar
