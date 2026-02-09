
# Capa de Reels - Implementacao Completa

## Resumo
Adicionar suporte a "Capa do Reels" em todo o fluxo: Gerador de Apresentacoes, Planejador de Conteudo, Agendador de Postagens. Inclui upload manual, geracao com IA e edicao no Editor de Imagens. A infraestrutura de publicacao (Meta API) ja esta pronta -- o campo `thumbnail_url` ja existe na tabela `scheduled_posts` e a Edge Function `publish-scheduled-post` ja envia `cover_url` para a API do Instagram.

---

## O que ja funciona
- Tabela `scheduled_posts` ja tem coluna `thumbnail_url`
- Edge Function `publish-scheduled-post` ja envia `cover_url` ao Meta quando `thumbnail_url` esta preenchido
- Hook `useScheduledPosts` ja suporta `thumbnail_url` no `CreateScheduledPostInput`

## O que precisa ser feito

### 1. Migracao de Banco de Dados
Adicionar coluna `reels_cover_url` em duas tabelas:
- `content_plan_posts` -- para o Planejador de Conteudo
- `presentation_creatives` -- para o Gerador de Apresentacoes

### 2. Gerador de Apresentacoes (CreativeForm.tsx)
Quando o tipo de criativo for "reels":
- Exibir secao "Capa do Reels" abaixo da secao de midias
- Mostrar preview da capa atual (se existir)
- Botao de upload manual de imagem (reutilizar ImageUploader)
- Botao "Gerar com IA" que chama `generate-visual-creative` com tipo `instagram_feed` e contexto do Reels (headline, objetivo, roteiro)
- Botao "Editar" que abre o ImageEditorModal para ajustes manuais
- Salvar a URL na nova coluna `reels_cover_url` da tabela `presentation_creatives` via creative_media ou diretamente

### 3. Planejador de Conteudo (ContentPlanPostCard.tsx)
Quando o post for do tipo "reels":
- Adicionar secao "Capa do Reels" no card expandido, similar a secao de imagem do post estatico
- Upload manual via ImageUploader
- Botao "Gerar com IA" usando `generate-visual-creative` (mesmo padrao do slide de carrossel)
- Botao "Editar" para abrir ImageEditorModal
- Salvar na coluna `reels_cover_url` da tabela `content_plan_posts`
- Ao enviar posts para o agendador, propagar a `reels_cover_url` como `thumbnail_url` do `scheduled_posts`

### 4. Agendador de Postagens (NewPostModal.tsx)
Quando o tipo de conteudo for "reel":
- Exibir secao "Capa do Reels" abaixo do upload de midia
- Mostrar preview da capa e permitir upload/remocao
- Salvar como `thumbnail_url` no `scheduled_posts` (coluna ja existente)
- Ao editar um post agendado, carregar o `thumbnail_url` existente

### 5. Agendador - Card de Post (PostCard.tsx)
- Quando for Reel com `thumbnail_url`, exibir indicador visual (badge ou miniatura da capa)
- Na edicao, permitir trocar a capa

---

## Detalhes Tecnicos

### Migracao SQL
```sql
ALTER TABLE content_plan_posts ADD COLUMN reels_cover_url TEXT;
ALTER TABLE presentation_creatives ADD COLUMN reels_cover_url TEXT;
```

### Fluxo de Geracao de Capa com IA
Reutilizar a chamada existente a `generate-visual-creative` com:
- `creativeType`: `instagram_feed` (formato 4:5 ou 9:16)
- `theme`: headline ou objetivo do Reels
- `approvedText`: headline + subheadline
- `context.contextOnly`: informacoes do roteiro para contexto

### Fluxo de Propagacao
```text
Apresentacao/Planejador --> reels_cover_url (BD)
        |
        v
Agendamento --> thumbnail_url (scheduled_posts)
        |
        v
Publicacao --> cover_url (Meta API) [ja implementado]
```

### Arquivos Impactados
- `supabase/migrations/` -- nova migracao para colunas
- `src/integrations/supabase/types.ts` -- tipos atualizados
- `src/components/presentations/CreativeForm.tsx` -- secao de capa para Reels
- `src/components/content-planner/ContentPlanPostCard.tsx` -- secao de capa para Reels
- `src/components/scheduling/NewPostModal.tsx` -- upload de capa no agendador
- `src/hooks/useContentPlans.tsx` -- incluir `reels_cover_url` no tipo e queries
- `src/hooks/usePresentations.ts` -- incluir `reels_cover_url` no tipo
- Fluxos de envio ao agendador (ImportFromPlanDialog, usePresentationMeetings) -- propagar capa
