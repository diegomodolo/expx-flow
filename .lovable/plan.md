

# Integracao Google Meet - Transcricao Automatica e Resumos com IA

## Visao Geral

Integrar o Google Meet ao sistema para que reunioes possam ser criadas pela aplicacao, e ao terminar, a transcricao seja capturada automaticamente, processada por IA para gerar resumos executivos, e salva no banco de dados vinculada ao cliente/squad.

## Pre-requisitos (Configuracao no Google Cloud Console)

Antes da implementacao, voce precisara:

1. No Google Cloud Console do seu projeto (o mesmo usado pelo Google Ads):
   - Habilitar as APIs: **Google Meet REST API**, **Google Drive API**, **Google Docs API**
   - No OAuth Consent Screen, adicionar os escopos:
     - `https://www.googleapis.com/auth/meetings.space.created`
     - `https://www.googleapis.com/auth/meetings.space.readonly`
     - `https://www.googleapis.com/auth/drive.readonly`
   - Nas credenciais OAuth (as mesmas do Google Ads), adicionar a redirect URI do sistema

2. Os secrets `GOOGLE_ADS_CLIENT_ID` e `GOOGLE_ADS_CLIENT_SECRET` ja existem e serao reutilizados (sao as mesmas credenciais OAuth do Google Cloud Project)

---

## Parte 1: Banco de Dados

### Tabela `google_meet_meetings`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| company_id | UUID FK | Empresa |
| client_id | UUID FK (nullable) | Cliente vinculado |
| squad_id | UUID FK (nullable) | Squad vinculada |
| created_by | UUID | Usuario que criou |
| google_space_id | TEXT | ID do espaco no Meet |
| meeting_uri | TEXT | Link da reuniao |
| meeting_code | TEXT | Codigo da reuniao |
| conference_record_id | TEXT (nullable) | ID do registro pos-reuniao |
| status | TEXT | scheduled, in_progress, completed, failed |
| title | TEXT | Titulo da reuniao |
| scheduled_at | TIMESTAMPTZ (nullable) | Data agendada |
| started_at | TIMESTAMPTZ (nullable) | Inicio real |
| ended_at | TIMESTAMPTZ (nullable) | Fim real |
| transcript_status | TEXT | pending, processing, completed, failed, not_available |
| raw_transcript | TEXT (nullable) | Transcricao bruta |
| ai_summary | TEXT (nullable) | Resumo gerado por IA |
| ai_action_items | JSONB (nullable) | Itens de acao extraidos |
| transcript_doc_url | TEXT (nullable) | URL do Google Docs |
| created_at / updated_at | TIMESTAMPTZ | Timestamps |

### Tabela `google_meet_participants`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| meeting_id | UUID FK | Reuniao |
| user_id | UUID (nullable) | Usuario do sistema |
| display_name | TEXT | Nome exibido |
| email | TEXT (nullable) | Email |
| joined_at | TIMESTAMPTZ (nullable) | Quando entrou |
| left_at | TIMESTAMPTZ (nullable) | Quando saiu |

### RLS Policies
- Acesso restrito por `company_id` usando `is_company_member(auth.uid(), company_id)`

---

## Parte 2: Edge Functions

### 2.1 `google-meet-create` - Criar Reuniao

- Recebe: `title`, `clientId`, `squadId`, `scheduledAt`
- Usa o `access_token` do Google (da tabela `google_ads_integrations`) para chamar `POST https://meet.googleapis.com/v2/spaces`
- Configura transcricao automatica via `config.transcriptionConfig`
- Salva na tabela `google_meet_meetings`
- Retorna o link da reuniao

### 2.2 `google-meet-check-transcript` - Buscar Transcricao

- Recebe: `meetingId`
- Consulta `conferenceRecords` do Google Meet API para obter o status
- Se a conferencia terminou, busca `conferenceRecords.transcripts`
- Extrai as `entries` (falas com autor e timestamp)
- Concatena em texto bruto e salva em `raw_transcript`
- Dispara processamento com IA

### 2.3 `google-meet-process-summary` - Gerar Resumo com IA

- Recebe: `meetingId`
- Le o `raw_transcript` do banco
- Envia para API de IA (reutilizando o padrao ja existente no `ai-chat`)
- Prompt estruturado para extrair:
  - Resumo executivo
  - Decisoes tomadas
  - Proximos passos com responsaveis
  - Tarefas sugeridas
- Salva `ai_summary` e `ai_action_items` no banco

### 2.4 `google-meet-webhook` - Listener de Eventos (opcional/futuro)

- Endpoint publico para receber eventos da Workspace Events API
- Detecta quando reuniao termina e dispara busca de transcricao automaticamente
- Alternativa: polling via cron/scheduler (mais simples para MVP)

---

## Parte 3: Interface do Usuario

### 3.1 Pagina de Reunioes (`/reunioes`)

- Rota nova no sidebar dentro da categoria "Equipe"
- Listagem de reunioes com filtros por status, cliente, squad
- Cards com: titulo, cliente, data, status, link para resumo

### 3.2 Componente "Criar Reuniao"

- Modal com campos: titulo, cliente (select), squad (select), data/hora
- Botao gera o link do Meet e exibe para copiar
- Link salvo automaticamente no banco

### 3.3 Componente "Detalhes da Reuniao"

- Exibe o resumo gerado pela IA em formato estruturado
- Secao de transcricao bruta (colapsavel)
- Lista de action items com botao "Criar Tarefa" que cria task no board do usuario
- Participantes da reuniao

### 3.4 Widget no Canal do Cliente

- Pequeno card mostrando "Ultima reuniao" com link para o resumo
- Indicador de reuniao em andamento

---

## Parte 4: Fluxo Completo

```text
[Usuario clica "Criar Reuniao"]
        |
        v
[Edge Function cria Space no Google Meet]
        |
        v
[Link exibido - usuario compartilha e faz a reuniao]
        |
        v
[Reuniao termina - Google processa transcricao (~2-5 min)]
        |
        v
[Usuario clica "Buscar Transcricao" ou polling automatico]
        |
        v
[Edge Function busca transcript entries via Meet API]
        |
        v
[Texto enviado para IA - gera resumo + action items]
        |
        v
[Resumo salvo e exibido na interface]
        |
        v
[Usuario cria tarefas a partir dos action items]
```

---

## Parte 5: Detalhes Tecnicos

### Autenticacao Google

O sistema ja possui OAuth com Google (via Google Ads). O token armazenado em `google_ads_integrations` sera reutilizado, porem sera necessario:
- Adicionar os escopos do Meet ao fluxo OAuth existente
- Implementar refresh de token antes de chamar APIs do Meet

### Retry para Transcricao

A transcricao do Google pode levar 2-5 minutos apos o fim da reuniao. A estrategia sera:
- Primeira tentativa imediata apos detectar fim
- Se nao disponivel, agendar retry com backoff (30s, 60s, 120s)
- Maximo de 5 tentativas

### Sequencia de Implementacao

1. Migracao do banco (tabelas + RLS)
2. Edge function `google-meet-create`
3. Edge function `google-meet-check-transcript`
4. Edge function `google-meet-process-summary`
5. Hook `useGoogleMeetMeetings`
6. Pagina `/reunioes` com listagem
7. Modal de criacao
8. Tela de detalhes com resumo
9. Integracao com sistema de tarefas
10. Widget no canal do cliente

