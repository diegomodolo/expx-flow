---
description: Implementa uma melhoria em funcionalidade existente seguindo os padroes do modulo
argument-hint: <descricao da melhoria>
---

# /melhoria

Melhoria solicitada: $ARGUMENTS

Delegue este trabalho ao agente `orquestrador` (via Task tool) com o briefing abaixo. Não implemente diretamente.

## Briefing para o orquestrador

Executar o fluxo **Melhoria** definido em `agents/orquestrador.md`:

1. Ler a skill de contexto do módulo afetado (`.claude/skills/<modulo>/SKILL.md`) — obrigatório antes de mexer.
2. Mapear impacto: schema? permissões? Edge Functions? UI? → definir agentes e ordem.
3. Delegar em ordem de dependência: `backend` → `auth` (se permissões) → `frontend` → `testing`. Cada agente carrega `.claude/rules/global.md` + sua rule escopada e usa as skills playbook (`new-table`, `new-edge-function`, `add-permission`, `new-component`, `write-test`).
4. Se tocou rotas/sidebar/permissões → validação com `permissions`.
5. Pipeline verde obrigatório: `npm run test:ci` + `npm run lint` + `npm run build`.
6. Atualizar a skill de contexto do módulo com o que mudou (padrões novos, armadilhas encontradas).

## Output esperado (PT-BR)

- O que foi melhorado e em quais arquivos
- Quais agentes executaram cada parte
- Resultado do pipeline
- Skill de contexto atualizada
- Sugerir `/deploy` para publicar
