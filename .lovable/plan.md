

# Plano: Carga dos 30 Templates Prontos + Scoring/Badges Configurados

## Resumo

Vou implementar 3 grandes melhorias no modulo GroupOps:

1. **Seed de 30 templates prontos** -- botao "Carregar Templates Padrao" que insere todos os 30 templates fornecidos de uma vez
2. **Scoring pre-configurado** -- ajustar as regras padrao e criar o perfil automaticamente com os valores especificados
3. **4 Badges pre-configurados** -- botao para criar os badges padrao (CEO Estrategico, Gestor de Processo, Alta Performance, Previsivel)

---

## O que sera feito

### 1. Seed de Templates (30 templates)

Criar uma funcao `seedDefaultTemplates` no hook `useGroupOpsTemplates.ts` que insere em batch todos os 30 templates:

- **10 Provocacao Diaria** (P1-P10) -- categoria `DAILY_PROMPT`, tom `provocative`
- **5 Check-in** (C1-C5) -- categoria `CHECKIN`, tom `professional`
- **5 Desafio 48h** (D1-D5) -- categoria `CHALLENGE`, tom `provocative`
- **4 Case Anonimo** (CA1-CA4) -- categoria `CASE_STUDY`, tom `professional`
- **3 Ranking Semanal** (R1-R3) -- categoria `RANKING`, tom `motivational`
- **3 Boas-vindas/Reativacao** (B1-B3) -- categorias `WELCOME`/`REACTIVATION`, tom `casual`

Cada template tera os placeholders extraidos automaticamente do corpo da mensagem.

Na UI de Templates (`GroupOpsTemplatesList.tsx`), adicionar um botao **"Carregar Templates Padrao"** que so aparece quando nao ha templates cadastrados (ou como opcao no header). Ao clicar, insere todos os 30 de uma vez.

### 2. Scoring Pre-Configurado

Atualizar `DEFAULT_SCORING_RULES` no hook `useGroupOpsScoring.ts` para refletir exatamente a tabela fornecida:

| Acao | Pontos |
|------|--------|
| Responder check-in | +2 |
| Completar desafio 48h | +6 |
| Enviar case | +5 |
| Responder provocacao | +2 |
| Streak 3 check-ins | +4 |
| Flood / spam | -5 |

Remover `warning: -3` e ajustar `message: 0` para `provocacao: 2` (responder provocacao).

### 3. Badges Pre-Configurados

Adicionar botao **"Carregar Badges Padrao"** na aba de Badges que cria os 4 badges:

- **CEO Estrategico** (icone: brain) -- condicao: 3 check-ins seguidos
- **Gestor de Processo** (icone: gear) -- condicao: 2 desafios concluidos
- **Alta Performance** (icone: fire) -- condicao: Top 3 da semana
- **Previsivel** (icone: chart) -- condicao: Media >= 8 em check-ins

### 4. Placeholders extras para Ranking

Adicionar placeholders de ranking no hook de templates:
- `{{top1_nome}}`, `{{top1_score}}`
- `{{top2_nome}}`, `{{top2_score}}`
- `{{top3_nome}}`, `{{top3_score}}`
- `{{dor_principal}}`

---

## Detalhes Tecnicos

### Arquivos modificados

1. **`src/hooks/useGroupOpsTemplates.ts`**
   - Adicionar array `DEFAULT_TEMPLATES` com os 30 templates
   - Adicionar placeholders de ranking ao `AVAILABLE_PLACEHOLDERS`
   - Adicionar mutation `seedDefaultTemplates` que faz batch insert

2. **`src/hooks/useGroupOpsScoring.ts`**
   - Atualizar `DEFAULT_SCORING_RULES` com valores corretos
   - Ajustar labels no componente
   - Adicionar mutation `seedDefaultBadges` para criar os 4 badges padrao

3. **`src/components/groupops/GroupOpsTemplatesList.tsx`**
   - Adicionar botao "Carregar Templates Padrao" no header (ou no estado vazio)

4. **`src/components/groupops/GroupOpsScoring.tsx`**
   - Atualizar `SCORING_RULE_LABELS` para refletir as novas chaves
   - Adicionar botao "Carregar Badges Padrao" na aba de Badges

