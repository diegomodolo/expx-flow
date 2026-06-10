---
description: Investiga a causa raiz de um bug e reporta diagnostico completo, SEM aplicar correcao
argument-hint: <descricao do bug ou sintoma>
---

# /analisar-bug

Bug relatado: $ARGUMENTS

Delegue este trabalho ao agente `orquestrador` (via Task tool) com o briefing abaixo. Não investigue diretamente.

## Briefing para o orquestrador

Executar o fluxo **Análise de bug** definido em `agents/orquestrador.md`:

1. Carregar `.claude/rules/global.md` e a skill de contexto do módulo afetado (se existir).
2. Reproduzir/entender o sintoma. Atalhos obrigatórios:
   - "Dados não aparecem" → skill `debug-data`
   - "Acesso Negado" indevido → agente `permissions`
3. Delegar a investigação ao agente do domínio (frontend/backend/auth) com a rule escopada.
4. **NÃO aplicar nenhuma correção** — este command é só diagnóstico.

## Output esperado (PT-BR)

```markdown
## Diagnóstico do Bug

### Sintoma

### Causa Raiz

(com evidências: arquivo:linha, query, log)

### Arquivos Envolvidos

### Correção Proposta

(o que mudar, esforço estimado, riscos)

### Como validar a correção
```

Ao final, informar que a correção pode ser aplicada com `/corrigir-bug`.
