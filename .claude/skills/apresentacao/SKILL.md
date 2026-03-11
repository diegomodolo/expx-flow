# Apresentacao (Apresentacao de Conteudo) — Skill de Contexto do Modulo

## Visao Geral

O modulo de Apresentacao e um sistema de apresentacao e aprovacao de criativos de marketing. O cliente acessa via link publico (sem login), visualiza os criativos em mockups de Instagram, aprova ou rejeita cada um, e ao final recebe um email com o resumo da reuniao.

**Rota publica:** `/apresentacao/:token` — sem autenticacao, acesso via `public_token` UUID.

### Fluxo Principal

```
Publicar apresentacao (gera token UUID)
  → Cliente acessa link publico
    → Slide 0: Capa (logo + titulo + data)
    → Slide 1: Formulario de participantes
    → "Iniciar Apresentacao" (cria meeting no banco)
    → Slides 2..N-1: Criativos (mockup Instagram + detalhes + aprovar/rejeitar)
    → Slide N: Resumo da reuniao
    → "Finalizar" (atualiza status + envia email resumo)
```

### Status dos Criativos

```
pending → approved (aprovado na reuniao)
pending → rejected (rejeitado com motivo)
approved/rejected → resubmitted (reenviado apos revisao)
approved → scheduled (enviado para agendamento)
```

---

## Arquivos-Chave

### Pagina Principal

| Arquivo | Responsabilidade |
|---|---|
| `src/pages/ApresentacaoPublica.tsx` | (~900 linhas) Pagina publica de apresentacao. Gerencia slides, meeting lifecycle, aprovacoes, navegacao por teclado, sessao restauravel |

### Componentes de Apresentacao

| Arquivo | Responsabilidade |
|---|---|
| `src/components/presentation/InstagramMockup.tsx` | Mockup realista de post Instagram com deteccao automatica de aspect ratio (1:1, 4:5, 16:9, 9:16), carrossel com navegacao, video nativo |
| `src/components/presentation/ParticipantsForm.tsx` | Formulario de participantes (nome, cargo, email) antes de iniciar |
| `src/components/presentation/ApprovalButtons.tsx` | Botoes de aprovar/rejeitar com indicador de status |
| `src/components/presentation/RejectionModal.tsx` | Modal para capturar motivo da rejeicao |
| `src/components/presentation/MeetingSummarySlide.tsx` | Slide final: stats, lista de participantes, tabela de status, botao finalizar |
| `src/components/presentation/AddParticipantButton.tsx` | Adicionar participante durante a reuniao |

### Componentes de Gestao (area interna)

| Arquivo | Responsabilidade |
|---|---|
| `src/components/presentation-details/CreativesList.tsx` | Lista de criativos com badges de status e preview |
| `src/components/presentation-details/MeetingsHistory.tsx` | Historico de reunioes com datas, participantes, stats |
| `src/components/presentation-details/CreativePreviewModal.tsx` | Preview full-screen de criativo |
| `src/components/presentation-details/SendToScheduleModal.tsx` | Enviar criativos aprovados para agendamento |

### Hooks

| Arquivo | Responsabilidade |
|---|---|
| `src/hooks/usePresentations.ts` | CRUD de apresentacoes + `publishPresentation` (gera token) + `usePublicPresentation` (fetch por token) |
| `src/hooks/usePresentationMeetings.ts` | Gestao de reunioes, aprovacoes, upload de gravacao, `useSendToSchedule` |

### Backend

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/20251214210849_*.sql` | Tabelas principais + RLS |
| `supabase/migrations/20251214214007_*.sql` | Tabelas de meeting + RLS |
| `supabase/functions/send-presentation-summary/` | Edge function que envia email resumo via Resend API |

---

## Modelo de Dados

### Tabelas

| Tabela | Campos-chave | Notas |
|---|---|---|
| `content_presentations` | id, client_id, company_id, name, month, year, primary_color, secondary_color, status, public_token, view_count | Token unico gerado no publish |
| `presentation_creatives` | id, presentation_id, creative_type, order_index, headline, caption, hashtags, objective, current_status, scheduled_post_id | Tipos: post_unico, carrossel, reels, stories |
| `creative_media` | id, creative_id, media_url, media_type, order_index, slide_headline, slide_subheadline | Storage bucket: `presentation-media` |
| `presentation_meetings` | id, presentation_id, status, current_slide, started_at, ended_at, approved_count, rejected_count, summary_sent | Status: in_progress, completed, cancelled |
| `presentation_meeting_participants` | id, meeting_id, name, role, email | Participantes da reuniao |
| `presentation_creative_approvals` | id, meeting_id, creative_id, status, rejection_reason, approved_at | Unique: (meeting_id, creative_id) |

### RLS para Acesso Publico

As policies permitem acesso publico (sem auth) quando:
- `content_presentations.status = 'published'` AND `public_token IS NOT NULL`
- Criativos e media herdam o acesso da apresentacao publicada
- Meetings podem ser criados/atualizados por qualquer um se a apresentacao estiver publicada

---

## Padroes Estabelecidos

### 1. Sistema de Slides

A apresentacao e um array de slides renderizados condicionalmente:

```
Slide 0: Capa (sempre)
Slide 1: Participantes (sempre)
Slides 2 a N-1: Um por criativo (creative[i - 2])
Slide N: Resumo (sempre)
```

Navegacao por setas do teclado + botoes na UI. Navegacao bloqueada antes do meeting iniciar (exceto slides 0 e 1).

### 2. Aspect Ratio Dinamico no InstagramMockup

O componente detecta automaticamente o aspect ratio a partir dos metadados da midia:

```typescript
// Carrega Image/Video nativo para ler dimensoes
const img = new Image();
img.onload = () => {
  const ratio = img.naturalWidth / img.naturalHeight;
  // ratio <= 0.6 → stories/reels (9:16)
  // ratio <= 0.85 → portrait (4:5)
  // ratio > 1.2 → landscape (16:9)
  // else → square (1:1)
};
```

Container vertical usa `w-[320px] h-[95%]`, horizontal usa `w-full max-w-[500px] h-auto`.

### 3. Sessao Restauravel

Se o usuario recarregar a pagina durante uma reuniao:
- Fetch busca meeting com `status = 'in_progress'` para a apresentacao
- Restaura `meetingId`, `participants`, `approvals`, `currentSlide`
- Permite continuar de onde parou

### 4. Debounced Slide Tracking

O slide atual e salvo no banco com debounce de 500ms para evitar writes excessivos durante navegacao rapida.

### 5. Token de Acesso Publico

```typescript
// Publicar: gera token e atualiza status
const token = crypto.randomUUID();
await supabase.from('content_presentations')
  .update({ public_token: token, status: 'published' })
  .eq('id', presentationId);

// URL publica: /apresentacao/{token}
// RLS permite acesso sem auth via public_token
```

### 6. Email de Resumo

Ao finalizar a reuniao, chama edge function `send-presentation-summary` que:
- Recebe meetingId, participantes, criativos, dados da apresentacao
- Gera HTML com tabela de aprovacoes
- Envia via Resend API para todos os participantes
- Marca `summary_sent = true` no meeting

---

## Armadilhas e Bugs Resolvidos

### 1. Legenda cortada nos mockups de Instagram (VISUAL)

**Sintoma**: Na tela de apresentacao, a legenda dos criativos nao aparecia completa nos mockups do Instagram.

**Causa raiz (dupla truncagem)**:
1. `InstagramMockup.tsx`: `caption.substring(0, 100)` cortava em 100 caracteres
2. `InstagramMockup.tsx`: `line-clamp-2` limitava a 2 linhas CSS
3. `ApresentacaoPublica.tsx`: Painel lateral usava `line-clamp-6`

**Solucao**:
- Mockup: Removido `substring` e `line-clamp-2`. Agora exibe texto completo com `whitespace-pre-wrap` e `max-h-40 overflow-y-auto` para legendas muito longas
- Painel lateral: Removido `line-clamp-6`, exibe legenda completa

**Licao**: Em telas de apresentacao/aprovacao, NUNCA truncar conteudo — o cliente precisa ver o texto completo para aprovar.

### 2. Container com overflow-hidden corta conteudo

O container raiz do `InstagramMockup` tem `overflow-hidden` (necessario para o aspect ratio da imagem). A legenda fica FORA da area de overflow da imagem, na secao de acoes do Instagram. Se a legenda for muito longa, ela cresce dentro da div de acoes que tem `shrink-0`, nao e cortada pelo overflow do container pai.

---

## Contexto Nao-Obvio

### 1. Dois tipos de apresentacao

Existem DUAS paginas publicas de apresentacao distintas:
- `/apresentacao/:token` → `ApresentacaoPublica.tsx` — Apresentacao de **conteudo** (criativos para aprovacao)
- `/resultados/:token` → `ApresentacaoResultadosPublica.tsx` — Apresentacao de **resultados** (metricas de campanhas)

Nao confundir. Este skill cobre apenas a de conteudo.

### 2. Navegacao por teclado

Setas esquerda/direita e Space navegam slides. Listener desativado quando:
- Um input/textarea esta em foco
- Um modal esta aberto
- Meeting nao foi iniciado (exceto slides 0-1)

### 3. Carrossel dentro de slide

Cada slide de criativo pode ter um carrossel de midias (multiple `creative_media`). A navegacao do carrossel e independente da navegacao de slides. O `currentCarouselIndex` reseta para 0 ao mudar de slide.

### 4. Theming dinamico com primaryColor

A cor primaria da apresentacao (`primary_color` do banco) e propagada para todos os componentes via prop. Botoes, gradientes e detalhes visuais usam essa cor para manter a identidade visual do cliente.

### 5. View count incrementa silenciosamente

Ao carregar a apresentacao publica, o `view_count` e incrementado via RPC ou update direto. Isso e feito uma vez por sessao.

### 6. Meeting participants nao tem auth

Os participantes da reuniao sao apenas registros no banco (nome, cargo, email). Nao possuem conta no sistema. As aprovacoes sao feitas sem autenticacao — qualquer pessoa com o link pode aprovar/rejeitar.

### 7. Finalizacao bloqueia se houver pendentes

O botao "Finalizar Reuniao" no `MeetingSummarySlide` fica desabilitado se ainda existirem criativos com status `pending`. Todos devem ser aprovados ou rejeitados antes de finalizar.

### 8. Storage bucket publico

As midias ficam no bucket `presentation-media` que e **publico**. As URLs de midia sao acessiveis diretamente sem token de auth — necessario para que o cliente veja as imagens/videos sem login.
