# Google Meet Per-User Integration — Design Spec

## Objetivo

Migrar a integração Google Meet de per-company para per-user. Cada usuário conecta sua própria conta Google para que reuniões sejam criadas na conta dele e salvas no Google Calendar dele. A integração da empresa é mantida como fallback.

## Arquitetura

### Tabela `google_meet_integrations`

Adicionar coluna `user_id UUID NULL` à tabela existente.

- `user_id = NULL` → integração da empresa (legado/fallback)
- `user_id = UUID` → integração individual do usuário

**Constraint UNIQUE:** Trocar de `UNIQUE(company_id)` para `UNIQUE(company_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'))` para permitir N integrações por empresa (1 por user + 1 da empresa).

### Hierarquia de Token (getValidAccessToken)

```
1. Buscar WHERE company_id = X AND user_id = currentUser AND is_active = true
2. Se encontrou → usar token do usuário
3. Se não encontrou → buscar WHERE company_id = X AND user_id IS NULL AND is_active = true
4. Se encontrou → usar token da empresa (fallback)
5. Se nenhum → throw error "Conecte sua conta Google em Perfil > Google Meet"
```

## Fluxo OAuth

O fluxo OAuth existente é reaproveitado com uma diferença: o `userId` é passado no body da chamada ao `google-meet-oauth`.

### Per-User (novo)

1. Usuário acessa `/perfil` e clica "Conectar Google Meet"
2. Redirect para Google OAuth (mesmos scopes)
3. Callback `/google-meet/callback` — frontend envia `userId` + `companyId` ao `google-meet-oauth`
4. Edge function faz upsert com `user_id` preenchido

### Per-Company (existente, mantido)

1. Admin acessa `/configuracoes/integracao-google-meet`
2. Mesmo fluxo, mas sem `userId` → upsert com `user_id = NULL`

## Mudanças — Frontend

### Página de Perfil (`/perfil`)

Adicionar seção "Google Meet" com:

- Status da conexão (email conectado ou "Não conectado")
- Botão "Conectar Google Meet" / "Desconectar"
- Indicador de expiração do token
- Botão "Atualizar Token" se próximo de expirar

### Hook `useGoogleMeetIntegration`

- Aceitar parâmetro opcional `userId: string`
- Quando `userId` presente: busca/gerencia integração per-user
- `connectGoogle()` inclui `userId` no `state` do OAuth URL
- `loadIntegration()` filtra por `user_id` quando presente

### Callback (`GoogleMeetCallback.tsx`)

- Extrair `userId` do state do OAuth (se presente)
- Passar `userId` ao `handleCallback()` junto com `companyId`

### Página de Configurações (existente)

- Sem mudanças significativas — continua gerenciando integração da empresa
- Adicionar nota informativa: "Esta é a conta padrão da empresa. Cada colaborador pode conectar sua própria conta em Perfil > Google Meet."

## Mudanças — Backend

### Migration SQL

```sql
-- Adicionar user_id
ALTER TABLE public.google_meet_integrations
  ADD COLUMN user_id UUID DEFAULT NULL;

-- Remover constraint UNIQUE antiga
ALTER TABLE public.google_meet_integrations
  DROP CONSTRAINT IF EXISTS google_meet_integrations_company_id_key;

-- Nova constraint que permite 1 integração por user por empresa + 1 da empresa
CREATE UNIQUE INDEX idx_google_meet_integrations_company_user
  ON public.google_meet_integrations (company_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'));

-- Atualizar RLS policies
-- Usuário vê: suas integrações + integração da empresa
DROP POLICY IF EXISTS "Users can view google meet integrations" ON public.google_meet_integrations;
CREATE POLICY "Users can view google meet integrations"
ON public.google_meet_integrations FOR SELECT
USING (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
  AND (user_id = auth.uid() OR user_id IS NULL)
);

-- Usuário pode criar sua própria integração
DROP POLICY IF EXISTS "Users can insert google meet integrations" ON public.google_meet_integrations;
CREATE POLICY "Users can insert google meet integrations"
ON public.google_meet_integrations FOR INSERT
WITH CHECK (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
  AND (user_id = auth.uid() OR user_id IS NULL)
);

-- Usuário pode atualizar sua própria integração
DROP POLICY IF EXISTS "Users can update google meet integrations" ON public.google_meet_integrations;
CREATE POLICY "Users can update google meet integrations"
ON public.google_meet_integrations FOR UPDATE
USING (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
  AND (user_id = auth.uid() OR user_id IS NULL)
);
```

### Edge Function `google-meet-oauth`

- Aceitar `userId` opcional no body
- No `exchange`: upsert com `user_id` quando presente
- No `refresh_token`: aceitar `userId` para identificar qual integração refreshar

### Edge Function `google-meet-create`

- Receber `userId` do JWT (auth.uid())
- `getValidAccessToken(supabaseClient, companyId, userId)`:
  1. Tenta buscar integração do user
  2. Fallback para integração da empresa
  3. Auto-refresh se token expirando

### Edge Function `google-meet-check-transcript`

- Mesma lógica de fallback no `getValidAccessToken`
- Precisa do `created_by` da meeting para saber qual token usar

### Edge Function `google-meet-process-summary`

- Não usa token Google — sem mudanças necessárias

## Decisões

| Decisão                            | Escolha                                                      |
| ---------------------------------- | ------------------------------------------------------------ |
| Usuário sem conta Google conectada | Fallback para conta da empresa; se nem empresa tem, bloqueia |
| Onde conectar conta pessoal        | Página de perfil (`/perfil`)                                 |
| Integração per-company existente   | Mantida como fallback                                        |
| Estrutura de dados                 | Coluna `user_id` nullable na tabela existente                |
