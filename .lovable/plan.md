
# Plano: YouTube Content Lab - Análise de Engajamento e Geração de Roteiros

## Resumo do Recurso

Uma nova área dentro dos detalhes do cliente chamada **"YouTube Content Lab"** que permite:
1. **Cadastrar múltiplos canais do YouTube** para monitorar
2. **Analisar vídeos com maior engajamento** (views, likes, comentários) em períodos configuráveis
3. **Identificar temas de sucesso** usando IA
4. **Receber sugestões de vídeos** baseadas na análise
5. **Criar roteiros com IA** através de um editor com chat integrado
6. **Gerar thumbnails e títulos** engajantes baseados em referências

---

## Arquitetura do Recurso

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         YouTube Content Lab (Nova Aba do Cliente)                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │  📺 CANAIS MONITORADOS                                                       │    │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                 │    │
│  │  │ @CanalA        │  │ @CanalB        │  │ + Adicionar    │                 │    │
│  │  │ 1.2M inscritos │  │ 500K inscritos │  │   Novo Canal   │                 │    │
│  │  └────────────────┘  └────────────────┘  └────────────────┘                 │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │  📊 PERÍODO DE ANÁLISE                                                       │    │
│  │  [Último dia] [3 dias] [7 dias] [15 dias] [30 dias] [60 dias] [90 dias]     │    │
│  │  [Período personalizado: ___/___ até ___/___]                               │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │  🔥 VÍDEOS COM MAIOR ENGAJAMENTO                                            │    │
│  │  ┌────────────────────────────────────────────────────────────────────────┐ │    │
│  │  │  ┌─────────┐  Como fazer X em 5 passos                               │ │    │
│  │  │  │  THUMB  │  👁 1.2M views  ❤️ 45K likes  💬 2.3K comentários       │ │    │
│  │  │  │         │  Taxa engajamento: 4.2%   Tema: Tutorial prático         │ │    │
│  │  │  └─────────┘  [📝 Criar Roteiro Similar]                             │ │    │
│  │  └────────────────────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │  💡 SUGESTÕES DE VÍDEOS (Baseado na Análise)                                │    │
│  │  ┌───────────────────────────────────────────────────────────────────────┐  │    │
│  │  │ 1. "Tutorial: [Tema relacionado ao cliente]"                          │  │    │
│  │  │    Baseado no sucesso de vídeos tutoriais com alta retenção          │  │    │
│  │  │    [✓ Selecionar para Roteiro]                                        │  │    │
│  │  └───────────────────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Clica em "Criar Roteiro"
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          Script Builder (Modal/Tela Dedicada)                        │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────┐  ┌────────────────────────────────────────────┐ │
│  │  📝 ROTEIRO                   │  │  💬 CHAT COM IA                             │ │
│  │  ─────────────────────────    │  │  ───────────────────────────────────────── │ │
│  │  [Título do vídeo...]        │  │  Você: Pode tornar a abertura mais         │ │
│  │                              │  │        impactante?                          │ │
│  │  ## ABERTURA (0-15s)         │  │                                             │ │
│  │  Gancho: "Você sabia que..." │  │  IA: Claro! Aqui está uma versão mais       │ │
│  │                              │  │      impactante da abertura...              │ │
│  │  ## DESENVOLVIMENTO          │  │                                             │ │
│  │  ...                         │  │  [Digite sua mensagem...]                   │ │
│  │                              │  │                                             │ │
│  │  ## CTA                      │  │                                             │ │
│  │  ...                         │  │                                             │ │
│  └────────────────────────────────┘  └────────────────────────────────────────────┘ │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │  🎨 CRIAÇÃO DE THUMBNAIL E TÍTULO                                           │    │
│  │  ┌───────────────────────────────────┐  ┌────────────────────────────────┐  │    │
│  │  │  REFERÊNCIAS (thumbs analisadas)  │  │  THUMBNAIL GERADA              │  │    │
│  │  │  ┌─────┐ ┌─────┐ ┌─────┐         │  │  ┌────────────────────────────┐│  │    │
│  │  │  │ 📷  │ │ 📷  │ │ 📷  │         │  │  │                            ││  │    │
│  │  │  └─────┘ └─────┘ └─────┘         │  │  │   THUMBNAIL 1280x720       ││  │    │
│  │  │                                   │  │  │                            ││  │    │
│  │  │  [Selecionar referências]        │  │  └────────────────────────────┘│  │    │
│  │  └───────────────────────────────────┘  └────────────────────────────────┘  │    │
│  │                                                                              │    │
│  │  TÍTULOS SUGERIDOS:                                                          │    │
│  │  ○ "5 Segredos que NINGUÉM te conta sobre X" (Urgência + Curiosidade)       │    │
│  │  ○ "PARE de fazer isso! O erro #1 em X" (Gatilho negativo + Autoridade)     │    │
│  │  ○ "Como eu consegui [resultado] em [tempo]" (Prova social)                 │    │
│  │  [🔄 Gerar mais títulos] [🎨 Gerar Thumbnail]                                │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  [💾 Salvar Roteiro] [📋 Copiar Tudo] [📤 Exportar PDF]                             │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Etapas de Implementação

### Fase 1: Estrutura de Dados

**1.1 Criar tabela `youtube_monitored_channels`**
Armazena os canais do YouTube que o cliente quer monitorar.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| client_id | uuid | FK para clients |
| company_id | uuid | FK para companies |
| channel_id | text | ID do canal no YouTube |
| channel_url | text | URL completa do canal |
| channel_name | text | Nome do canal |
| channel_handle | text | @handle do canal |
| thumbnail_url | text | Foto do canal |
| subscriber_count | integer | Número de inscritos |
| is_active | boolean | Se está sendo monitorado |
| created_at | timestamptz | Data de criação |
| created_by | uuid | Usuário que adicionou |

**1.2 Criar tabela `youtube_video_analyses`**
Cache dos vídeos analisados com métricas.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| channel_id | uuid | FK para youtube_monitored_channels |
| client_id | uuid | FK para clients |
| video_id | text | ID do vídeo no YouTube |
| title | text | Título do vídeo |
| description | text | Descrição do vídeo |
| thumbnail_url | text | URL da thumbnail |
| published_at | timestamptz | Data de publicação |
| view_count | bigint | Visualizações |
| like_count | bigint | Curtidas |
| comment_count | bigint | Comentários |
| duration_seconds | integer | Duração em segundos |
| engagement_rate | numeric | Taxa de engajamento calculada |
| analyzed_at | timestamptz | Quando foi analisado |
| ai_theme_analysis | text | Análise de tema pela IA |
| ai_summary | text | Resumo do conteúdo |

**1.3 Criar tabela `youtube_content_suggestions`**
Sugestões geradas pela IA.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| client_id | uuid | FK para clients |
| company_id | uuid | FK para companies |
| title | text | Título sugerido |
| description | text | Descrição da sugestão |
| based_on_videos | jsonb | Array de video_ids que inspiraram |
| theme_category | text | Categoria do tema |
| estimated_engagement | text | Previsão de engajamento |
| status | text | pending, selected, scripted, completed |
| created_at | timestamptz | Data de criação |

**1.4 Criar tabela `youtube_scripts`**
Roteiros criados para vídeos.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| client_id | uuid | FK para clients |
| company_id | uuid | FK para companies |
| suggestion_id | uuid | FK para youtube_content_suggestions (opcional) |
| title | text | Título do roteiro |
| script_content | text | Conteúdo do roteiro em markdown |
| suggested_titles | jsonb | Array de títulos sugeridos |
| thumbnail_url | text | URL da thumbnail gerada |
| reference_thumbnails | jsonb | URLs das thumbs de referência |
| video_duration_target | integer | Duração alvo em segundos |
| status | text | draft, review, approved, produced |
| created_at | timestamptz | Data de criação |
| updated_at | timestamptz | Última atualização |
| created_by | uuid | Usuário que criou |

**1.5 Criar tabela `youtube_script_messages`**
Mensagens do chat de refinamento do roteiro.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| script_id | uuid | FK para youtube_scripts |
| role | text | user ou assistant |
| content | text | Conteúdo da mensagem |
| created_at | timestamptz | Data da mensagem |

---

### Fase 2: Edge Functions

**2.1 `analyze-youtube-channel`**
- Recebe URL do canal
- Usa YouTube Data API v3 para buscar:
  - Informações do canal (nome, subscribers, etc.)
  - Lista de vídeos recentes com estatísticas
- Calcula taxa de engajamento: `(likes + comments) / views * 100`
- Retorna dados estruturados

**2.2 `fetch-youtube-videos-stats`**
- Recebe lista de channel_ids e período
- Busca vídeos publicados no período
- Calcula e ordena por engajamento
- Usa IA para analisar temas dos top vídeos

**2.3 `generate-video-suggestions`**
- Recebe análise dos vídeos de maior sucesso
- Usa contexto do cliente (setor, público, briefing)
- Gera sugestões de vídeos personalizadas
- Retorna lista rankeada de ideias

**2.4 `generate-video-script`**
- Recebe sugestão ou tema
- Contexto do cliente
- Referências de vídeos de sucesso
- Gera roteiro estruturado com:
  - Gancho de abertura
  - Desenvolvimento em seções
  - CTA final
  - Timestamps sugeridos

**2.5 `refine-script-chat`**
- Recebe script_id e mensagem
- Mantém histórico da conversa
- Usa IA para refinar roteiro conforme feedback
- Atualiza script_content

**2.6 `generate-youtube-titles`**
- Recebe tema/roteiro
- Analisa títulos de vídeos de sucesso
- Gera títulos usando gatilhos mentais
- Retorna lista com análise de cada título

**2.7 `generate-youtube-thumbnail`**
- Recebe referências de thumbnails
- Tema e título do vídeo
- Usa Gemini Image (google/gemini-3-pro-image-preview)
- Gera thumbnail 1280x720
- Faz upload para storage

---

### Fase 3: Frontend - Componentes

**3.1 Página principal: `ClienteYouTubeContentLab.tsx`**
- Layout com tabs:
  - Canais Monitorados
  - Análise de Engajamento
  - Sugestões de Vídeos
  - Meus Roteiros

**3.2 Componentes:**
- `YouTubeChannelManager.tsx` - Gerenciar canais monitorados
- `YouTubeChannelCard.tsx` - Card de cada canal
- `YouTubeAddChannelDialog.tsx` - Modal para adicionar canal
- `YouTubePeriodSelector.tsx` - Seletor de período de análise
- `YouTubeVideoAnalytics.tsx` - Grid de vídeos com métricas
- `YouTubeVideoCard.tsx` - Card de vídeo com stats
- `YouTubeSuggestionsList.tsx` - Lista de sugestões de vídeos
- `YouTubeSuggestionCard.tsx` - Card de sugestão
- `YouTubeScriptBuilder.tsx` - Editor de roteiro + chat
- `YouTubeScriptEditor.tsx` - Textarea com formatação markdown
- `YouTubeScriptChat.tsx` - Chat lateral para refinamento
- `YouTubeThumbnailGenerator.tsx` - Gerador de thumbnails
- `YouTubeTitleGenerator.tsx` - Gerador de títulos

**3.3 Hooks:**
- `useYouTubeChannels.tsx` - CRUD de canais monitorados
- `useYouTubeAnalytics.tsx` - Buscar e cachear análises
- `useYouTubeSuggestions.tsx` - Gerenciar sugestões
- `useYouTubeScripts.tsx` - CRUD de roteiros
- `useYouTubeScriptChat.tsx` - Chat do builder

---

### Fase 4: Integrações

**4.1 Adicionar rota no `ClienteDetalhes.tsx`**
```typescript
<Route path="youtube-content-lab" element={<ClienteYouTubeContentLab />} />
```

**4.2 Adicionar item no menu lateral `ClientDetailsLayout.tsx`**
Dentro do grupo "Criação de Conteúdo":
```typescript
{ title: "YouTube Content Lab", href: `/clientes/${clientId}/youtube-content-lab`, icon: Youtube }
```

**4.3 Configurar secret `YOUTUBE_API_KEY`**
Necessário para usar YouTube Data API v3.

---

## Fluxo do Usuário

1. **Configuração Inicial**
   - Usuário acessa "YouTube Content Lab" nos detalhes do cliente
   - Adiciona canais do YouTube para monitorar (próprio canal ou concorrentes)

2. **Análise de Engajamento**
   - Seleciona período de análise
   - Sistema busca vídeos e calcula engajamento
   - Exibe ranking de vídeos mais engajantes
   - IA analisa temas e padrões de sucesso

3. **Receber Sugestões**
   - IA gera sugestões de vídeos baseadas:
     - Nos temas de maior sucesso
     - No perfil do cliente
     - No público-alvo
   - Usuário seleciona sugestão para criar roteiro

4. **Criar Roteiro**
   - Abre Script Builder
   - IA gera roteiro inicial estruturado
   - Usuário refina via chat integrado
   - Edita diretamente no editor

5. **Gerar Título e Thumbnail**
   - Seleciona thumbnails de referência dos vídeos analisados
   - IA gera opções de títulos engajantes
   - IA gera thumbnail baseada nas referências
   - Usuário pode regenerar até ficar satisfeito

6. **Exportar**
   - Salva roteiro completo
   - Exporta para PDF ou copia
   - Baixa thumbnail em alta resolução

---

## Detalhes Técnicos

### YouTube Data API v3
```typescript
// Buscar canal por URL/handle
const channelUrl = `https://youtube.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${handle}&key=${YOUTUBE_API_KEY}`;

// Buscar vídeos do canal
const videosUrl = `https://youtube.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=50&publishedAfter=${startDate}&key=${YOUTUBE_API_KEY}`;

// Buscar estatísticas dos vídeos
const statsUrl = `https://youtube.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds.join(',')}&key=${YOUTUBE_API_KEY}`;
```

### Cálculo de Engajamento
```typescript
const engagementRate = ((likeCount + commentCount) / viewCount) * 100;
```

### Prompt para Análise de Temas
```typescript
const prompt = `Analise os seguintes vídeos de maior sucesso e identifique:
1. Temas/assuntos mais populares
2. Formatos que funcionam (tutorial, listicle, storytelling, etc.)
3. Padrões nos títulos
4. Elementos que geram engajamento

Vídeos:
${videos.map(v => `- "${v.title}" (${v.views} views, ${v.engagement}% engajamento)`).join('\n')}

Retorne uma análise estruturada em JSON.`;
```

### Prompt para Geração de Roteiro
```typescript
const prompt = `Crie um roteiro completo para vídeo do YouTube sobre "${topic}" para o cliente ${clientName}.

CONTEXTO DO CLIENTE:
${clientContext}

REFERÊNCIAS DE SUCESSO:
${successfulVideos.map(v => `- "${v.title}" - ${v.theme}`).join('\n')}

ESTRUTURA DO ROTEIRO:
## HOOK (0-15s)
Gancho inicial para prender atenção

## INTRODUÇÃO (15-45s)
Apresentação do tema e promessa de valor

## DESENVOLVIMENTO
### Ponto 1 (Timestamp)
### Ponto 2 (Timestamp)
### Ponto 3 (Timestamp)

## CTA (últimos 15s)
Call to action claro

## NOTAS DE PRODUÇÃO
- Sugestões de B-roll
- Momentos para gráficos/texto na tela
- Tom de voz e energia`;
```

---

## Requisitos de API

**YouTube Data API v3** - Será necessário adicionar a chave de API como secret:
- `YOUTUBE_API_KEY` - Chave da API do YouTube

A API tem quota diária de 10.000 unidades. Custos aproximados:
- Buscar canal: 1 unidade
- Buscar vídeos: 100 unidades  
- Buscar estatísticas: 1 unidade por 50 vídeos

Para economizar quota, os dados serão cacheados na tabela `youtube_video_analyses`.

---

## Arquivos a Criar/Modificar

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/cliente/ClienteYouTubeContentLab.tsx` | Página principal |
| `src/components/youtube-content-lab/YouTubeChannelManager.tsx` | Gerenciador de canais |
| `src/components/youtube-content-lab/YouTubeChannelCard.tsx` | Card de canal |
| `src/components/youtube-content-lab/YouTubeAddChannelDialog.tsx` | Modal adicionar canal |
| `src/components/youtube-content-lab/YouTubePeriodSelector.tsx` | Seletor de período |
| `src/components/youtube-content-lab/YouTubeVideoAnalytics.tsx` | Grid de análise |
| `src/components/youtube-content-lab/YouTubeVideoCard.tsx` | Card de vídeo |
| `src/components/youtube-content-lab/YouTubeSuggestionsList.tsx` | Lista de sugestões |
| `src/components/youtube-content-lab/YouTubeScriptBuilder.tsx` | Builder principal |
| `src/components/youtube-content-lab/YouTubeScriptEditor.tsx` | Editor de roteiro |
| `src/components/youtube-content-lab/YouTubeScriptChat.tsx` | Chat IA |
| `src/components/youtube-content-lab/YouTubeThumbnailGenerator.tsx` | Gerador de thumb |
| `src/components/youtube-content-lab/YouTubeTitleGenerator.tsx` | Gerador de títulos |
| `src/hooks/useYouTubeChannels.tsx` | Hook de canais |
| `src/hooks/useYouTubeAnalytics.tsx` | Hook de análises |
| `src/hooks/useYouTubeSuggestions.tsx` | Hook de sugestões |
| `src/hooks/useYouTubeScripts.tsx` | Hook de roteiros |
| `src/hooks/useYouTubeScriptChat.tsx` | Hook do chat |
| `supabase/functions/analyze-youtube-channel/index.ts` | Edge function análise canal |
| `supabase/functions/fetch-youtube-videos-stats/index.ts` | Edge function buscar vídeos |
| `supabase/functions/generate-video-suggestions/index.ts` | Edge function sugestões |
| `supabase/functions/generate-video-script/index.ts` | Edge function roteiro |
| `supabase/functions/refine-script-chat/index.ts` | Edge function chat |
| `supabase/functions/generate-youtube-titles/index.ts` | Edge function títulos |
| `supabase/functions/generate-youtube-thumbnail/index.ts` | Edge function thumbnail |

### Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/ClienteDetalhes.tsx` | Adicionar rota para YouTube Content Lab |
| `src/components/clients/ClientDetailsLayout.tsx` | Adicionar item no menu |
| `supabase/config.toml` | Adicionar novas edge functions |

### Migrações SQL

1 migração para criar as 5 tabelas com RLS policies apropriadas.

---

## Estimativa de Complexidade

| Fase | Esforço | Prioridade |
|------|---------|------------|
| Fase 1: Estrutura de Dados | Médio | Alta |
| Fase 2: Edge Functions | Alto | Alta |
| Fase 3: Frontend | Alto | Alta |
| Fase 4: Integrações | Baixo | Alta |

**Total estimado**: Implementação completa em múltiplas iterações.

---

## Próximos Passos Recomendados

1. **Configurar YouTube API Key** - Necessário antes de qualquer implementação
2. **Criar estrutura de banco** - Migrations para as novas tabelas
3. **Implementar análise de canais** - Core do recurso
4. **Construir UI de análise** - Visualização dos dados
5. **Adicionar geração de sugestões** - IA para insights
6. **Implementar Script Builder** - Editor + Chat
7. **Adicionar geração de assets** - Títulos e thumbnails
