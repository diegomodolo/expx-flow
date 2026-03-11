# Release Notes - Design Spec

## Objetivo

Criar uma pagina de Release Notes acessivel pelo menu do perfil no PageHeader, que cataloga automaticamente todas as modificacoes do sistema (features, fixes, melhorias) a partir dos commits e PRs do GitHub.

## Arquitetura

- **Pagina** `/release-notes` — protegida com `ProtectedRoute`, acessivel via menu do perfil no PageHeader
- **Edge Function** `sync-release-notes` — busca commits e PRs da API do GitHub, categoriza por prefixo, salva no Supabase
- **Hook** `useReleaseNotes` — le do Supabase com `useQuery`, paginado, ordenado por data desc
- **Botao "Atualizar"** — chama a Edge Function sob demanda para forcar sync

## Tabela `release_notes`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | PK, default gen_random_uuid() |
| title | TEXT NOT NULL | Mensagem limpa (sem prefixo) |
| category | TEXT NOT NULL | `feature`, `fix`, `improvement`, `other` |
| description | TEXT | Body do PR ou null |
| source_type | TEXT NOT NULL | `commit` ou `pr` |
| source_ref | TEXT NOT NULL UNIQUE | SHA do commit ou numero do PR |
| source_url | TEXT | Link pro GitHub |
| author_name | TEXT | Nome do autor |
| published_at | TIMESTAMPTZ NOT NULL | Data do commit/merge |
| created_at | TIMESTAMPTZ | Default now() |

- RLS habilitado
- Policy: SELECT para authenticated (todos usuarios logados podem ler)
- GRANT SELECT, INSERT, UPDATE, DELETE para authenticated
- Indice em `published_at DESC` para ordenacao

## Edge Function `sync-release-notes`

- `verify_jwt = false` no config.toml (para poder ser chamada do frontend sem auth complexa)
- Usa `GITHUB_PAT` (ja existe como secret), `GITHUB_REPO_OWNER` e `GITHUB_REPO_NAME`
- Logica:
  1. Busca ultimo `published_at` da tabela `release_notes`
  2. Se vazio, busca ultimos 30 dias; senao, desde a ultima data
  3. Busca commits na main via GitHub API (`GET /repos/:owner/:repo/commits`)
  4. Busca PRs mergeados via GitHub API (`GET /repos/:owner/:repo/pulls?state=closed&sort=updated`)
  5. Deduplica: se commit pertence a um PR (merge_commit_sha), usa o PR e ignora o commit
  6. Categoriza pelo prefixo da mensagem:
     - `feat:` → `feature`
     - `fix:` → `fix`
     - `refactor:`, `perf:`, `chore:` → `improvement`
     - Outros → `other`
  7. Limpa o titulo removendo o prefixo (ex: "feat: adicionar X" → "adicionar X")
  8. Upsert por `source_ref` (evita duplicatas)
- Retorna `{ success: true, synced_count: N }`

## Hook `useReleaseNotes`

```typescript
export function useReleaseNotes() {
  // useQuery para buscar release_notes ordenado por published_at desc
  // Paginacao com limit/offset ou cursor
  // Mutation para chamar sync-release-notes Edge Function
  // Retorna: { notes, loading, hasMore, loadMore, sync, syncing }
}
```

## Pagina `ReleaseNotes.tsx`

- `DashboardLayout` obrigatorio
- Fundo branco, layout limpo e centrado (max-w-3xl)
- Header: titulo "Novidades do Sistema" + botao "Atualizar" com icone RefreshCw e loading spinner
- Agrupamento por mes/ano (ex: "Marco 2026")
- Cards com:
  - Badge colorido da categoria (verde=feature, vermelho=fix, azul=improvement, cinza=other)
  - Titulo da mudanca
  - Descricao (se houver, colapsavel se longa)
  - Autor e data relativa
  - Link para GitHub (icone externo discreto)
- Scroll infinito ou botao "Carregar mais"
- Estado vazio: "Nenhuma novidade ainda" com botao para sincronizar

## Categorias Visuais

| Categoria | Label | Cor | Badge |
|-----------|-------|-----|-------|
| feature | Nova Feature | verde (emerald) | bg-emerald-100 text-emerald-700 |
| fix | Correcao | vermelho (red) | bg-red-100 text-red-700 |
| improvement | Melhoria | azul (blue) | bg-blue-100 text-blue-700 |
| other | Outros | cinza (slate) | bg-slate-100 text-slate-700 |

## Menu do Perfil (DashboardHeader)

- Adicionar item "Novidades" entre "Meu Perfil" e o separador do "Sair"
- Icone: `Megaphone` do lucide-react
- Link para `/release-notes`

## Rota (App.tsx)

```tsx
<Route path="/release-notes" element={
  <ProtectedRoute>
    <ReleaseNotes />
  </ProtectedRoute>
} />
```

Nao requer permissao especifica — todos usuarios autenticados podem acessar.
