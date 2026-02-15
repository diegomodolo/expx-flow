

# Roteiros - Sistema de Templates de Tarefas

## Resumo

Criar um sistema completo de **Roteiros** que funciona como biblioteca de templates reutilizaveis. Cada roteiro agrupa atividades (subtarefas) que podem ser importadas para dentro de tarefas do tipo "historia" em qualquer projeto/cliente.

## O que sera construido

### 1. Banco de Dados (3 tabelas novas)

**`roteiro_categorias`** - Categorias dos roteiros
- id, company_id, nome, created_by, created_at, updated_at

**`roteiros`** - Os roteiros em si
- id, company_id, categoria_id (FK), nome, icone (nome do icone Lucide), objetivo (texto longo), publico (boolean, default false), created_by, created_at, updated_at

**`roteiro_atividades`** - Atividades dentro de cada roteiro
- id, roteiro_id (FK), titulo, tipo (tipo da tarefa), inicio_apos_dias (int), duracao_dias (int), responsavel_id (FK employees), quadro_column_id (FK task_board_columns), etapa (text), fluxo (text), tags (jsonb), descricao (text), autorizador_id (FK employees), checklist (jsonb), ordem (int), created_at, updated_at

RLS habilitado em todas as tabelas, filtrando por company_id.

### 2. Menu no Sidebar

Adicionar "Roteiros" dentro da secao **Equipe**, com icone `BookOpen`, apontando para `/roteiros`.

### 3. Pagina Principal `/roteiros`

- Barra de pesquisa no topo
- Filtro por categorias em abas (Todos, Onboarding, Social Media, etc.)
- Grid de cards com icone, nome do roteiro e categoria
- Botao "Novo Roteiro" no canto superior direito
- Ao clicar num card, abre a tela de detalhe/edicao do roteiro

### 4. Dialog/Modal de Criar/Editar Roteiro

Campos:
- Nome (input texto)
- Categoria (select com opcao de criar nova categoria inline via botao "+")
- Icone (seletor de icones Lucide - grid visual)
- Objetivo (textarea)
- Publico (switch sim/nao)

### 5. Tela de Detalhe do Roteiro

- Cabecalho com nome, categoria e icone
- Lista de atividades cadastradas (drag-and-drop para reordenar)
- Botao "Adicionar Atividade"

### 6. Dialog de Criar/Editar Atividade

Formulario com:
- Titulo
- Tipo (select)
- Inicio apos X dias (input numerico)
- Duracao em dias (input numerico)
- Responsavel (select dos colaboradores)
- Quadro Kanban (select dos boards existentes)
- Etapa Kanban (select das colunas do board selecionado)
- Fluxo (select)
- Tags (multi-select)
- Descricao (editor rich text ou textarea)
- Autorizador (select dos colaboradores)
- Checklist (adicionar itens dinamicamente)

### 7. Importar Roteiro para Tarefa (futuro proximo)

Na tela de tarefas, ao criar uma tarefa do tipo "historia", exibir opcao "Importar Roteiro" que cria subtarefas automaticamente baseadas nas atividades do roteiro selecionado, calculando datas relativas a partir da data de inicio.

---

## Detalhes Tecnicos

### Arquivos a criar:
- `supabase/migrations/xxx_create_roteiros.sql` - Migration com as 3 tabelas + RLS
- `src/pages/Roteiros.tsx` - Pagina principal com grid de roteiros
- `src/pages/RoteiroDetalhe.tsx` - Pagina de detalhe de um roteiro
- `src/components/roteiros/RoteiroCard.tsx` - Card visual do roteiro
- `src/components/roteiros/RoteiroDialog.tsx` - Modal criar/editar roteiro
- `src/components/roteiros/CategoriaDialog.tsx` - Modal criar categoria
- `src/components/roteiros/AtividadeDialog.tsx` - Modal criar/editar atividade
- `src/components/roteiros/AtividadeList.tsx` - Lista de atividades com reordenacao
- `src/components/roteiros/IconPicker.tsx` - Seletor visual de icones Lucide
- `src/hooks/useRoteiros.ts` - Hook com queries/mutations para roteiros
- `src/hooks/useRoteiroCategorias.ts` - Hook para categorias
- `src/hooks/useRoteiroAtividades.ts` - Hook para atividades

### Arquivos a editar:
- `src/components/dashboard/DashboardSidebar.tsx` - Adicionar item "Roteiros" na secao Equipe
- `src/App.tsx` - Adicionar rotas `/roteiros` e `/roteiros/:id`
- `src/integrations/supabase/types.ts` - Tipos gerados apos migration

### Padroes seguidos:
- React Query (TanStack) para data fetching, igual ao resto do projeto
- Componentes shadcn/ui existentes (Dialog, Select, Input, Card, Badge, etc.)
- Supabase client existente em `@/integrations/supabase/client`
- Hooks customizados no padrao `useXxx` com `useQuery`/`useMutation`
- Sidebar com permissao `"roteiros"` como MenuItemType

