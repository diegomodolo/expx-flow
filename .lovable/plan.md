
# Plano: Sistema de Documentos Estilo Notion

## Resumo
Criar uma funcionalidade completa de gerenciamento de documentos e pastas dentro do sistema, similar ao Notion, com:
- Icone no header para acesso rapido
- Organizacao de arquivos em pastas (sidebar esquerda)
- Area de trabalho para criar documentos (lado direito)
- Sistema de compartilhamento entre usuarios da empresa

---

## Arquitetura do Sistema

```text
+----------------------------------+
|         Workspace Page           |
+----------------------------------+
|  Sidebar   |    Document Editor  |
|  (Folders  |    (BlockNote)      |
|   & Files) |                     |
|            |  - Texto            |
|  [+ Nova]  |  - Listas           |
|  📁 Pasta1 |  - Tabelas          |
|    📄 Doc1 |  - Headings         |
|    📄 Doc2 |  - Checklists       |
|  📁 Pasta2 |                     |
|    📄 Doc3 |                     |
+----------------------------------+
```

---

## Estrutura de Banco de Dados

### Tabela: `workspace_folders`
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Primary key |
| company_id | uuid | FK para companies |
| parent_id | uuid | FK para workspace_folders (null = raiz) |
| name | text | Nome da pasta |
| icon | text | Emoji ou icone |
| created_by | uuid | FK para auth.users |
| created_at | timestamp | Data de criacao |
| updated_at | timestamp | Data de atualizacao |

### Tabela: `workspace_documents`
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Primary key |
| company_id | uuid | FK para companies |
| folder_id | uuid | FK para workspace_folders (null = raiz) |
| title | text | Titulo do documento |
| content | jsonb | Conteudo no formato BlockNote |
| icon | text | Emoji ou icone |
| cover_image | text | URL da imagem de capa |
| created_by | uuid | FK para auth.users |
| is_favorite | boolean | Marcado como favorito |
| created_at | timestamp | Data de criacao |
| updated_at | timestamp | Data de atualizacao |

### Tabela: `workspace_shares`
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Primary key |
| resource_type | text | 'folder' ou 'document' |
| resource_id | uuid | ID da pasta ou documento |
| shared_with_user_id | uuid | FK para auth.users |
| permission | text | 'view', 'edit', 'admin' |
| shared_by | uuid | Quem compartilhou |
| created_at | timestamp | Data do compartilhamento |

---

## Arquivos a Serem Criados

### 1. Componentes de UI
```text
src/components/workspace/
  ├── WorkspaceSidebar.tsx         # Sidebar com arvore de pastas/arquivos
  ├── WorkspaceFolderTree.tsx      # Componente de arvore de pastas
  ├── WorkspaceFolderItem.tsx      # Item individual de pasta
  ├── WorkspaceDocumentItem.tsx    # Item individual de documento
  ├── WorkspaceEditor.tsx          # Editor principal com BlockNote
  ├── WorkspaceHeader.tsx          # Header do documento com titulo/icone
  ├── WorkspaceEmptyState.tsx      # Estado vazio
  ├── WorkspaceShareDialog.tsx     # Modal de compartilhamento
  ├── CreateFolderDialog.tsx       # Modal para criar pasta
  └── CreateDocumentDialog.tsx     # Modal para criar documento
```

### 2. Pagina Principal
```text
src/pages/Workspace.tsx            # Pagina principal do workspace
```

### 3. Hooks
```text
src/hooks/
  ├── useWorkspaceFolders.tsx      # CRUD de pastas
  ├── useWorkspaceDocuments.tsx    # CRUD de documentos
  └── useWorkspaceShares.tsx       # Gerenciamento de compartilhamentos
```

### 4. Tipos
```text
src/types/workspace.ts             # Tipos TypeScript
```

---

## Modificacoes em Arquivos Existentes

### 1. DashboardHeader.tsx
- Adicionar icone do Workspace (FileText ou Book) ao lado dos outros icones
- Link para `/workspace`

### 2. App.tsx
- Adicionar rota protegida para `/workspace`
- Adicionar rota para `/workspace/:documentId` (documento especifico)

### 3. DashboardSidebar.tsx
- Adicionar item "Workspace" na categoria "Equipe & Sistema"

### 4. useEmployeePermissions.tsx
- Adicionar nova permissao: `'workspace'`

---

## Dependencia a Instalar

### BlockNote
Biblioteca de editor de blocos estilo Notion:
```
@blocknote/core
@blocknote/react
@blocknote/mantine (ou @blocknote/shadcn para integracao)
```

---

## Funcionalidades Detalhadas

### Sidebar (Lado Esquerdo)
1. **Favoritos**: Documentos marcados como favorito
2. **Compartilhados comigo**: Documentos/pastas compartilhados por outros
3. **Meus Documentos**: Arvore de pastas/documentos do usuario
4. **Acoes**:
   - Criar nova pasta
   - Criar novo documento
   - Arrastar e soltar para reorganizar
   - Menu de contexto (renomear, excluir, compartilhar)

### Editor (Lado Direito)
1. **Header**: Titulo editavel, icone/emoji, imagem de capa
2. **Toolbar**: Formatacao, inserir blocos
3. **Blocos suportados**:
   - Paragrafos
   - Titulos (H1, H2, H3)
   - Listas (bullet, numerada, checklist)
   - Tabelas
   - Imagens
   - Divisores
   - Codigo
   - Citacoes

### Compartilhamento
1. **Modal de compartilhamento**:
   - Buscar usuarios da empresa
   - Definir nivel de permissao (visualizar, editar, admin)
   - Copiar link (para usuarios com acesso)
2. **Indicadores visuais**:
   - Badge mostrando se e compartilhado
   - Lista de pessoas com acesso

---

## Ordem de Implementacao

1. **Fase 1 - Banco de Dados**
   - Criar tabelas no Supabase
   - Configurar RLS policies

2. **Fase 2 - Estrutura Base**
   - Instalar BlockNote
   - Criar tipos TypeScript
   - Criar hooks basicos

3. **Fase 3 - UI Principal**
   - Pagina Workspace
   - Sidebar com navegacao
   - Editor basico

4. **Fase 4 - CRUD Completo**
   - Criar/editar/excluir pastas
   - Criar/editar/excluir documentos
   - Drag and drop

5. **Fase 5 - Compartilhamento**
   - Modal de compartilhamento
   - Listagem de compartilhados
   - Permissoes granulares

6. **Fase 6 - Integracao**
   - Icone no header
   - Rota no sidebar
   - Permissoes no sistema

---

## Secao Tecnica

### RLS Policies (Supabase)

```sql
-- workspace_folders
CREATE POLICY "Users can view folders in their company" ON workspace_folders
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view shared folders" ON workspace_folders
  FOR SELECT USING (
    id IN (
      SELECT resource_id FROM workspace_shares 
      WHERE resource_type = 'folder' AND shared_with_user_id = auth.uid()
    )
  );

-- workspace_documents (similar)
-- workspace_shares
```

### Integracao BlockNote

```tsx
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

const editor = useCreateBlockNote({
  initialContent: document?.content || undefined,
});

// Salvar conteudo
const content = editor.document;
await saveDocument({ ...doc, content });
```

### Layout com Resizable Panels

```tsx
<ResizablePanelGroup direction="horizontal">
  <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
    <WorkspaceSidebar />
  </ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel defaultSize={75} minSize={50}>
    <WorkspaceEditor document={selectedDocument} />
  </ResizablePanel>
</ResizablePanelGroup>
```

---

## Resultado Final

Apos a implementacao, os usuarios terao:
- Acesso rapido via icone no header
- Sistema de pastas para organizacao
- Editor rico com blocos estilo Notion
- Compartilhamento granular com colegas da empresa
- Interface responsiva e moderna seguindo o design existente
