
# GroupOps - Gestao e Engajamento de Grupo WhatsApp

## Visao Geral
Modulo completo de gestao de grupos WhatsApp dentro do menu Customer Success, cobrindo dashboard, campanhas automatizadas, gamificacao, moderacao e CRM de membros. Devido ao tamanho do modulo, a implementacao sera dividida em **3 fases** para garantir qualidade e funcionalidade incremental.

---

## Fase 1 - Fundacao (esta implementacao)
Banco de dados completo + navegacao + telas de Dashboard, Grupos e Membros

## Fase 2 - Campanhas e Templates
Telas de Campanhas, Templates, calendario semanal, editor com placeholders e preview WhatsApp

## Fase 3 - Motor, Moderacao e Eventos
Scoring engine, badges, feed de eventos, moderacao automatica, regras anti-spam, modos do bot

---

## O que sera feito agora (Fase 1)

### 1. Migracao de Banco de Dados
Criacao de todas as tabelas do modelo de dados para nao precisar migrar depois:

- `groupops_groups` - grupos gerenciados (config_json, rules, status, quiet_hours, rate_limit, auto_reply_mode)
- `groupops_members` - membros com perfil completo (role, segment, size_bucket, primary_pain, tags, engagement_state, risk_level)
- `groupops_messages` - mensagens auditaveis (author, media, mentions, reply_to)
- `groupops_events` - motor de eventos (MESSAGE, CHECKIN_REPLY, CHALLENGE_JOIN, etc.)
- `groupops_score_ledger` - registro de pontuacao (+/-)
- `groupops_badges` - definicao de badges com regras
- `groupops_member_badges` - badges conquistados
- `groupops_campaigns` - automacoes (DAILY_PROMPT, CHECKIN, CHALLENGE, etc.)
- `groupops_templates` - templates com placeholders, variantes A/B, tone
- `groupops_moderation_rules` - regras de moderacao (flood, spam, agressividade)
- `groupops_moderation_actions` - historico de acoes de moderacao
- `groupops_scoring_profiles` - perfis de pontuacao (Padrao, Hardcore, Elite)

Todas com `company_id` e RLS habilitado.

### 2. Navegacao
- Adicionar item "GroupOps" no menu lateral do CS (`CSLayout.tsx`) com icone `MessageSquare`
- Criar sub-layout `GroupOpsLayout.tsx` com abas internas: Dashboard, Grupos, Campanhas, Templates, Membros, Pontuacao, Eventos, Moderacao, Relatorios, Configuracoes
- Registrar rotas em `App.tsx` sob `/cs/groupops/*`

### 3. Tela: Dashboard
- Seletor de grupo no header
- Cards KPI: Engajamento 24h/7d/30d, Mensagens/dia (sparkline com Recharts), % participacao check-ins, Silenciosos (>=14 dias), Risco de abandono
- Top 10 da semana com badges
- Radar do Grupo: temas quentes, perguntas sem resposta, membros em risco
- Acoes rapidas: Criar campanha, Postar provocacao, Pausar bot, Gerar ranking

### 4. Tela: Grupos
- Lista de grupos gerenciados com status (enabled/paused/archived)
- Modal de configuracao: quiet hours, rate limit, auto-reply mode (off/safe/full), approval_required
- Regras do grupo (textarea)
- Visao de calendario semanal de campanhas (placeholder para Fase 2)

### 5. Tela: Membros (CRM do Grupo)
- Tabela com filtros por tags, dor, risco, segmento
- Perfil do membro: historico de eventos, score ledger, badges
- Botoes de acao: DM, Mencao, Mute, Ban
- Indicadores de engagement_state: streak, silent_days, risk_level

### 6. Hooks e Tipos
- `useGroupOpsGroups.ts` - CRUD de grupos
- `useGroupOpsMembers.ts` - listagem e gestao de membros
- `useGroupOpsDashboard.ts` - dados agregados para dashboard
- Tipos TypeScript atualizados automaticamente via migracao

---

## Detalhes Tecnicos

### Estrutura de Arquivos

```text
src/
  components/
    groupops/
      GroupOpsLayout.tsx          -- Sub-layout com abas
      GroupOpsDashboard.tsx       -- Dashboard principal
      GroupOpsGroupsList.tsx      -- Lista de grupos
      GroupOpsGroupConfigModal.tsx -- Config do grupo
      GroupOpsMembersList.tsx     -- Tabela de membros
      GroupOpsMemberProfile.tsx   -- Perfil detalhado
      GroupOpsCampaignsList.tsx   -- Placeholder Fase 2
      GroupOpsTemplatesList.tsx   -- Placeholder Fase 2
      GroupOpsEventsFeed.tsx      -- Placeholder Fase 3
      GroupOpsModeration.tsx      -- Placeholder Fase 3
      GroupOpsScoring.tsx         -- Placeholder Fase 3
  pages/
    cs/
      GroupOpsPage.tsx            -- Pagina wrapper
  hooks/
    useGroupOpsGroups.ts
    useGroupOpsMembers.ts
    useGroupOpsDashboard.ts
```

### Modelo de Dados - Tabelas Principais

**groupops_groups**
- id, company_id, provider (default 'uazapi'), provider_group_id, name, description
- status (enabled/paused/archived), timezone, language, rules_text
- config_json (quiet_hours, rate_limit, auto_reply_mode, approval_required, default_scoring_profile_id)
- created_at, updated_at

**groupops_members**
- id, group_id, company_id, wa_user_id, phone_e164, display_name
- company_name, role, segment, size_bucket, primary_pain
- tags (text[]), status (active/muted/banned/left)
- last_message_at, last_participation_at, streak_days, silent_days, risk_level
- privacy_flags (jsonb)
- created_at, updated_at

**groupops_scoring_profiles**
- id, company_id, name, description, rules_json
- Exemplos de regras: message=0, checkin=+2, challenge_done=+6, case=+5, useful_reply=+3, streak_bonus=+4, spam=-5

### RLS
Todas as tabelas terao RLS habilitado com policies baseadas em `company_id` do usuario autenticado, seguindo o mesmo padrao das tabelas existentes no projeto.

### Integracao com UazapiGO
Na Fase 1, os grupos serao cadastrados manualmente (provider_group_id). Na Fase 3, sera implementada sincronizacao automatica via webhook existente do UazapiGO para popular mensagens e eventos em tempo real.

---

## Fases Futuras (nao implementadas agora)

**Fase 2 - Campanhas e Templates**
- Editor de templates com placeholders, variantes A/B, preview WhatsApp
- Calendario de campanhas (arrastaveis)
- 5 tipos de campanha: Provocacao diaria, Check-in, Desafio 48h, Case anonimo, Ranking semanal
- Scheduling com cron e targeting por segmento

**Fase 3 - Motor, Moderacao e Eventos**
- Intent Engine (parser de comandos: /ranking, /ajuda, /case)
- Campaign Window (janelas de pontuacao)
- Feed de eventos em tempo real
- Moderacao automatica (flood, spam, agressividade)
- Modos do bot (Safe/Full/Off)
- Regras anti-spam fixas
- Edge functions para processamento de webhook e scoring
