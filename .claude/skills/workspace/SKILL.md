---
name: workspace
description: "Use ao trabalhar no Workspace (/workspace): documentos e notas estilo Notion, pastas hierarquicas, editor BlockNote, compartilhamento com permissoes"
---

# Workspace — Skill de Contexto do Modulo

## Visao Geral

O Workspace e um sistema de gestao de documentos e notas internas, estilo Notion. Usuarios criam pastas hierarquicas e documentos com editor rico (BlockNote). Suporta compartilhamento com permissoes granulares (view/edit/admin), favoritos e drag-and-drop para organizar documentos entre pastas.

**Rota:** `/workspace` — protegida por `ProtectedRoute` (auth apenas, sem permissao especifica).

### Modelo de Dados

```
workspace_folders (hierarquia de pastas, self-referential via parent_id)
  └→ workspace_documents (documentos com conteudo JSONB BlockNote)
workspace_shares (compartilhamento por recurso: folder ou document)
```

---

## Arquivos-Chave

### Pagina e Componentes

| Arquivo                                             | Responsabilidade                                                                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/Workspace.tsx`                           | Pagina principal. `ResizablePanelGroup` horizontal: sidebar (25%) + editor (75%). State de `selectedDocument` e `selectedFolderId`                |
| `src/components/workspace/WorkspaceSidebar.tsx`     | Arvore de pastas com expand/collapse, lista de documentos, favoritos, drag-and-drop (react-beautiful-dnd), context menus, dialogs de delete/share |
| `src/components/workspace/WorkspaceEditor.tsx`      | Editor BlockNote com auto-save, edicao de titulo (blur-save), icon picker (12 emojis), toggle favorito, botao de compartilhar                     |
| `src/components/workspace/WorkspaceShareDialog.tsx` | Dialog de compartilhamento: adicionar usuarios, alterar permissao (view/edit/admin), remover acesso                                               |
| `src/components/workspace/CreateFolderDialog.tsx`   | Dialog para criar/renomear pastas com selecao de icone                                                                                            |

### Hooks

| Arquivo                               | Responsabilidade                                                          |
| ------------------------------------- | ------------------------------------------------------------------------- |
| `src/hooks/useWorkspaceFolders.tsx`   | CRUD de pastas. Query key: `['workspace-folders', companyId]`             |
| `src/hooks/useWorkspaceDocuments.tsx` | CRUD de documentos + favoritos. 3 query keys: por pasta, todos, favoritos |
| `src/hooks/useWorkspaceShares.tsx`    | CRUD de compartilhamentos. Lista usuarios da empresa para dropdown        |

### Tipos e Banco

| Arquivo                                     | Responsabilidade                                                                                            |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/types/workspace.ts`                    | Tipos: `WorkspaceFolder`, `WorkspaceDocument`, `WorkspaceShare`, `WorkspaceShareWithUser`, `FolderTreeItem` |
| `supabase/migrations/20260206181159_...sql` | Criacao das 3 tabelas, RLS policies, indices, triggers de updated_at                                        |

---

## Padroes Estabelecidos

### 1. Queries com 3 Query Keys (Documents)

O `useWorkspaceDocuments` mantem 3 queries separadas para diferentes visoes:

```typescript
["workspace-documents", companyId, folderId][ // docs de uma pasta (ou root se null)
  ("workspace-documents-all", companyId)
][("workspace-documents-favorites", companyId)]; // todos os docs da empresa // apenas favoritos
```

**Todas as 3 sao invalidadas** em qualquer mutacao (create/update/delete/toggleFavorite) para garantir consistencia.

### 2. Auto-Save no Editor

O `WorkspaceEditor` salva automaticamente via `onChange` do BlockNote:

- **Titulo**: salva no `onBlur` do input (nao a cada tecla)
- **Conteudo**: salva via `updateDocument.mutate()` no `onChange` do editor
- **Conteudo e JSONB**: Array de blocos BlockNote, armazenado como `content` (tipo `jsonb`, default `[]`)

### 3. Drag-and-Drop para Organizar Documentos

Usa `react-beautiful-dnd` no `WorkspaceSidebar`:

- **Droppable targets**: `folder-{folderId}` para pastas, `root` para raiz
- **Draggable items**: `doc-{docId}` para documentos
- No drop: chama `updateDocument.mutate({ id, folderId })` para mover
- Auto-expande a pasta destino no drop

### 4. Delete com Validacao de RLS

Deletes usam `.select('id')` apos `.delete()` para detectar falha silenciosa do RLS:

```typescript
const { data, error } = await supabase
  .from("workspace_documents")
  .delete()
  .eq("id", id)
  .select("id");

if (error) throw error;
if (!data || data.length === 0) throw new Error("Sem permissao para excluir");
```

### 5. Compartilhamento por Recurso

Shares sao granulares por recurso individual (nao herdam de pasta pai):

- `resource_type`: `'folder'` ou `'document'`
- `resource_id`: ID do recurso
- `permission`: `'view'` | `'edit'` | `'admin'`
- Unique constraint previne duplicatas: `(resource_type, resource_id, shared_with_user_id)`

---

## Armadilhas e Bugs Resolvidos

### 1. Todos os usuarios viam notas de todos (PRIVACIDADE)

**Sintoma**: Qualquer usuario da empresa via todas as notas de todos os outros usuarios.

**Causa raiz**: A RLS policy de SELECT em `workspace_documents` era:

```sql
-- ERRADA: permitia ver tudo da empresa
USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()))
```

**Solucao**: Substituir por policy que restringe ao criador + compartilhados:

```sql
-- CORRETA: so ve os proprios + compartilhados
USING (
  created_by = auth.uid()
  OR id IN (
    SELECT resource_id FROM workspace_shares
    WHERE shared_with_user_id = auth.uid()
    AND resource_type = 'document'
  )
)
```

Mesma correcao aplicada em `workspace_folders`.

**Licao**: RLS default por `company_id` funciona para dados compartilhados (campanhas, clientes), mas para dados pessoais (notas, documentos) a policy deve filtrar por `created_by` ou compartilhamento explicito.

### 2. Delete nao funcionava + tela travava (CRITICO)

**Sintoma**: Ao tentar excluir uma nota, ela continuava visivel e a tela travava (precisava F5).

**Causa raiz (2 problemas)**:

1. **RLS silenciosa**: O Supabase retornava sucesso no `.delete()` mesmo quando o RLS bloqueava a operacao. O frontend achava que deletou, invalidava queries, mas o dado continuava la.
2. **react-beautiful-dnd loop**: O DnD tentava reconciliar o estado (doc "deletado" localmente vs ainda presente no refetch), causando um loop de renders que travava a tela.

**Solucao**:

1. Adicionar `.select('id')` apos `.delete()` para verificar se algo foi realmente deletado
2. Se `data.length === 0`, lancar erro explicito: `'Sem permissao para excluir'`
3. Corrigir RLS DELETE policy para incluir usuarios com permissao admin em shares

### 3. Delete de pasta move documentos para raiz

**Comportamento**: Quando uma pasta e deletada, seus documentos NAO sao deletados — eles vao para a raiz (`folder_id = NULL`) porque o FK usa `ON DELETE SET NULL`.

**Atencao**: Shares de recursos dentro da pasta deletada ficam orfaos (nao sao cascadeados). Isso e aceito como trade-off — shares orfaos nao causam problemas funcionais.

---

## Contexto Nao-Obvio

### 1. Nao confundir com CRM Workspace

Existe um modulo separado chamado "CRM Workspace" (`useCRMWorkspace.tsx`, `useCRMWorkspaceGoals.tsx`) que gerencia `crm_workspaces` (integracao CRM por cliente). **Nao tem relacao com este modulo de documentos.**

### 2. Conteudo e JSONB (BlockNote format)

O campo `content` de `workspace_documents` armazena um array JSON de blocos BlockNote. Exemplo:

```json
[
  { "type": "paragraph", "content": [{ "type": "text", "text": "Hello" }] },
  {
    "type": "heading",
    "props": { "level": 2 },
    "content": [{ "type": "text", "text": "Title" }]
  }
]
```

Default e `[]` (documento vazio). O editor BlockNote renderiza e salva nesse formato automaticamente.

### 3. Hierarquia de pastas sem limite

O `parent_id` permite nesting infinito (self-referential FK). Na pratica, o `WorkspaceSidebar` renderiza recursivamente. Nao ha limite de profundidade no backend.

### 4. Favoritos sao flag, nao tabela

`is_favorite` e um boolean direto em `workspace_documents` (com indice filtrado `WHERE is_favorite = true`). Nao existe tabela separada de favoritos. E per-document, nao per-user (todos que tem acesso veem o mesmo estado de favorito).

### 5. Triggers de updated_at

Ambas as tabelas (`workspace_folders` e `workspace_documents`) tem triggers que atualizam `updated_at` automaticamente em qualquer UPDATE. Nao precisa setar manualmente.

### 6. Icones sao emojis armazenados como texto

Tanto pastas quanto documentos tem campo `icon` (text). Default: `'📁'` para pastas, `'📄'` para documentos. O editor e o sidebar renderizam o emoji diretamente. As opcoes sao hardcoded em arrays de 12 emojis nos componentes.

### 7. Permissoes de compartilhamento nao cascadeiam

Compartilhar uma pasta com um usuario NAO da acesso automatico aos documentos dentro dela. Cada recurso precisa ser compartilhado individualmente. O SELECT policy de documentos so checa shares do documento, nao da pasta pai.

---

## Estrutura do Banco de Dados

### Tabelas

| Tabela                | Campos-chave                                                                                  | Cascade                              |
| --------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------ |
| `workspace_folders`   | id, company_id, parent_id, name, icon, created_by                                             | company: CASCADE, parent: CASCADE    |
| `workspace_documents` | id, company_id, folder_id, title, content (JSONB), icon, cover_image, created_by, is_favorite | company: CASCADE, folder: SET NULL   |
| `workspace_shares`    | id, resource_type, resource_id, shared_with_user_id, permission, shared_by                    | Unique: (type, resource_id, user_id) |

### RLS Policies (corrigidas)

| Tabela    | SELECT                             | INSERT                   | UPDATE                    | DELETE       |
| --------- | ---------------------------------- | ------------------------ | ------------------------- | ------------ |
| folders   | created_by = uid() OR share exists | company member + creator | owner OR admin share      | owner only   |
| documents | created_by = uid() OR share exists | company member + creator | owner OR edit/admin share | owner only   |
| shares    | creator OR recipient               | resource owner only      | —                         | creator only |
