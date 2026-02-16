

# Mapa Mental -- Clone do MindMeister

## Resumo
Criar uma ferramenta de Mapa Mental dentro do menu "Rotina" do sidebar, inspirada no MindMeister. A ferramenta usara a biblioteca `@xyflow/react` (ja instalada no projeto) para renderizar os nos e conexoes do mapa mental em um canvas interativo.

## Estrutura

### 1. Banco de Dados -- Nova tabela `mind_maps`

| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid (PK) | ID do mapa |
| company_id | uuid (FK) | Empresa |
| title | text | Nome do mapa |
| description | text | Descricao opcional |
| nodes | jsonb | Array de nos do React Flow |
| edges | jsonb | Array de conexoes do React Flow |
| created_by | uuid (FK) | Criador |
| created_at | timestamptz | Data de criacao |
| updated_at | timestamptz | Data de atualizacao |

RLS habilitado com politica por `company_id`.

### 2. Pagina de Listagem -- `/mapas-mentais`

Seguindo o padrao de tabela usado em Checklists/Fluxos/Roteiros:
- Breadcrumb de navegacao
- Card com header (icone + titulo + botao "Novo Mapa")
- Campo de busca integrado
- Tabela com colunas: Nome, Descricao, Criado por, Atualizado em, Acoes
- Clique na linha navega para o editor

### 3. Editor do Mapa Mental -- `/mapas-mentais/:id`

Canvas interativo estilo MindMeister com as seguintes funcionalidades:

**Header fixo:**
- Botao de voltar
- Campo de titulo editavel inline
- Indicador de salvamento automatico
- Botoes de acao (zoom, centralizar, exportar)

**Canvas (React Flow):**
- No central (raiz) criado automaticamente
- Nos filhos com cores por nivel de profundidade
- Conexoes com curvas suaves (tipo `smoothstep`)
- Drag-and-drop para reposicionar nos
- Minimap no canto inferior

**Barra de ferramentas flutuante:**
- Adicionar no filho (Tab ou botao)
- Adicionar no irmao (Enter ou botao)
- Editar texto do no (duplo clique)
- Alterar cor do no
- Deletar no (Delete ou botao)

**Atalhos de teclado:**
- `Tab` -- adicionar filho
- `Enter` -- adicionar irmao
- `Delete/Backspace` -- remover no selecionado
- `F2` ou duplo clique -- editar texto
- `Ctrl+S` -- salvar (alem do auto-save)

**Auto-save:**
- Debounce de 2 segundos (mesmo padrao do editor de funis)

### 4. Componente de No Customizado -- `MindMapNode`

- Texto editavel inline
- Borda colorida por nivel (nivel 0: azul, nivel 1: verde, nivel 2: laranja, nivel 3: roxo, etc.)
- Handles de conexao nas 4 direcoes
- Indicador visual de no selecionado
- Botao "+" ao passar o mouse para adicionar filho rapidamente

### 5. Integracao no Sidebar

Adicionar ao grupo "Rotina" em `DashboardSidebar.tsx`:
```
{ title: "Mapas Mentais", url: "/mapas-mentais", icon: Brain, permission: "tarefas" }
```

### 6. Roteamento

Adicionar em `App.tsx`:
- `/mapas-mentais` -- pagina de listagem
- `/mapas-mentais/:id` -- editor do mapa

## Arquivos a Criar
- `src/pages/MapasMentais.tsx` -- listagem em tabela
- `src/pages/MapaMentalEditor.tsx` -- editor com React Flow
- `src/components/mind-map/MindMapNode.tsx` -- no customizado
- `src/components/mind-map/MindMapToolbar.tsx` -- barra de ferramentas flutuante
- `src/components/mind-map/useMindMapKeyboard.ts` -- hook de atalhos
- `src/hooks/useMindMaps.ts` -- CRUD com React Query + Supabase
- `supabase/migrations/xxx_create_mind_maps.sql` -- migracao do banco

## Arquivos a Modificar
- `src/App.tsx` -- adicionar rotas
- `src/components/dashboard/DashboardSidebar.tsx` -- adicionar item no menu Rotina
- `src/integrations/supabase/types.ts` -- tipos atualizados automaticamente

## Detalhes Tecnicos

- A biblioteca `@xyflow/react` v12 ja esta instalada e sera reaproveitada
- Layout automatico dos nos usando algoritmo de arvore (calculo manual de posicoes x/y baseado em profundidade e indice do no)
- Os dados de nos e edges sao armazenados como JSONB, permitindo flexibilidade total
- O componente de no usa `NodeProps` do React Flow com `memo` para performance

