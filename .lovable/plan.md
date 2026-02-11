
# Agendamento com Collab no Instagram

## Objetivo
Adicionar a funcionalidade de **post em colaboracao (Collab)** no agendamento de publicacoes do Instagram, permitindo convidar outras contas do Instagram como colaboradores.

## Como funciona no Instagram
A API Graph do Instagram permite enviar o parametro `collaborators` (lista de usernames) ao criar o container de midia. Ate 5 contas podem ser convidadas como colaboradores. O post aparece nos dois perfis apos o colaborador aceitar o convite.

Formatos suportados: Imagem, Carrossel e Reels (Stories nao e suportado).

## Alteracoes

### 1. Banco de Dados
- Adicionar coluna `collaborators` (tipo `text[]`) na tabela `scheduled_posts` para armazenar os usernames dos colaboradores

### 2. Frontend - NewPostModal.tsx
- Adicionar campo de input para usernames de colaboradores (visivel apenas quando Instagram esta selecionado)
- Interface com chips/tags: o usuario digita um @username e pressiona Enter para adicionar
- Limite visual de 5 colaboradores
- Salvar os usernames no campo `collaborators` do post

### 3. Frontend - Hook useScheduledPosts
- Atualizar o tipo `ScheduledPost` e `CreateScheduledPostInput` para incluir `collaborators: string[]`

### 4. Backend - publish-scheduled-post Edge Function
- Na funcao `publishToInstagram`, ao montar o `containerBody`, incluir o parametro `collaborators` com a lista de usernames quando disponivel
- Formato: `collaborators: JSON.stringify(usernames)`

### 5. Frontend - PostCard e PostPreviewModal
- Exibir os colaboradores listados no card/preview do post agendado

---

## Detalhes Tecnicos

**Parametro da API Meta:**
```
POST graph.facebook.com/{ig-user-id}/media
  ?image_url=...
  &caption=...
  &collaborators=['username1','username2']
```

**Migracao SQL:**
```sql
ALTER TABLE scheduled_posts ADD COLUMN collaborators text[] DEFAULT '{}';
```

**Arquivos modificados:**
- `supabase/functions/publish-scheduled-post/index.ts`
- `src/components/scheduling/NewPostModal.tsx`
- `src/hooks/useScheduledPosts.tsx` (tipos)
- `src/components/scheduling/PostCard.tsx` (exibicao)
- `src/components/scheduling/PostPreviewModal.tsx` (exibicao)
