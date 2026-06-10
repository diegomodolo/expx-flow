---
description: Analisa a causa raiz de um bug, aplica a correcao, cobre com teste e valida o pipeline
argument-hint: <descricao do bug ou referencia a analise anterior>
---

# /corrigir-bug

Bug a corrigir: $ARGUMENTS

Delegue este trabalho ao agente `orquestrador` (via Task tool) com o briefing abaixo. Não corrija diretamente.

## Briefing para o orquestrador

Executar o fluxo **Correção de bug** definido em `agents/orquestrador.md`:

1. Se já existe diagnóstico (de um `/analisar-bug` anterior nesta conversa), partir dele. Senão, executar a análise primeiro.
2. Delegar a correção ao agente do domínio (frontend/backend/auth) com a causa raiz + `.claude/rules/global.md` + rule escopada.
3. Delegar ao agente `testing` um teste que reproduz o bug (falha antes, passa depois), quando o alvo for testável.
4. Se a correção tocou rotas/sidebar/permissões → validação com o agente `permissions`.
5. Verificar pipeline: `npm run test:ci` + `npm run lint` + `npm run build`. Falha em qualquer um = correção não está pronta.

## Output esperado (PT-BR)

- Causa raiz e correção aplicada (arquivos alterados)
- Teste criado (ou justificativa de por que não foi testável)
- Resultado do pipeline (testes/lint/build)
- Sugerir `/deploy` para publicar
