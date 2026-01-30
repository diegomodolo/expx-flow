

# Plano: Tabela de Saúde da Carteira + Filtro "Meu Squad" Padrão

## Resumo das Alterações

Vou adicionar duas melhorias à página de Saúde da Carteira:

1. **Visualização em Tabela** (padrão) com opção de trocar para cards
2. **Filtro "Meu Squad"** como valor inicial padrão

---

## Como vai funcionar

### Visualização em Tabela

A tabela mostrará as mesmas informações dos cards, organizadas em colunas:

| Cliente | Squad | Saúde | Financeiro | Operacional | Relacional | ROAS | NPS | Risco | Ações |
|---------|-------|-------|------------|-------------|------------|------|-----|-------|-------|
| Avatar + Nome | Badge colorido | 78% (barra) | 85 | 72 | 78 | 2.3x | 8 | Médio | Menu |

- **Toggle no header**: Botões para alternar entre Tabela (ícone List) e Cards (ícone Grid3x3)
- **Ações na tabela**: Ao clicar na linha, abre detalhes do cliente. Menu dropdown com WhatsApp, Ligar, Touchpoint, NPS

### Filtro Padrão "Meu Squad"

- Quando o usuário abrir a página pela primeira vez, o filtro já virá setado em "Meu Squad" (se o usuário tiver um squad configurado)
- Se não tiver squad, continua mostrando "Todos os Squads"
- A preferência fica salva no localStorage normalmente

---

## Detalhes Técnicos

### Arquivos a Modificar

#### 1. `src/contexts/CSSquadFilterContext.tsx`
- Alterar a lógica de inicialização para usar `mySquadId` como default quando não há valor no localStorage
- Adicionar um `useEffect` que seta o filtro para "meu squad" após carregar os dados do squad do usuário (apenas na primeira visita)

```typescript
// Nova lógica de inicialização
const [hasInitialized, setHasInitialized] = useState(false);

useEffect(() => {
  // Se nunca foi setado no localStorage e temos mySquadId, usar como default
  if (!hasInitialized && mySquadData?.id) {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      setSelectedSquadIdState(mySquadData.id);
    }
    setHasInitialized(true);
  }
}, [mySquadData, hasInitialized]);
```

#### 2. `src/pages/cs/CSPortfolioPage.tsx`
- Adicionar estado `viewMode` com valor padrão `'table'`
- Adicionar toggle de visualização no header (ToggleGroup com Grid3x3 e List)
- Criar componente de tabela inline com as colunas necessárias
- Persistir preferência de visualização no localStorage

#### 3. Novo componente inline na página (ou extrair depois)
- Tabela com:
  - Avatar + Nome do cliente (clicável)
  - Badge do Squad com cor
  - Barra de progresso da Saúde Total
  - Scores dos 3 pilares (Financeiro, Operacional, Relacional)
  - ROAS atual vs meta
  - NPS
  - Badge de Risco
  - Menu de ações (WhatsApp, Ligar, Touchpoint, NPS, Ver Cliente)

---

## Fluxo do Usuário

1. CS acessa `/cs/carteira`
2. Filtro já vem em "Meu Squad" (se configurado)
3. Visualização padrão é em tabela
4. Pode clicar no toggle para ver em cards
5. Pode mudar filtro para outro squad ou "Todos"
6. Preferências ficam salvas para próximas visitas

---

## Componentes Reutilizados

- `ToggleGroup` / `ToggleGroupItem` - já existe no projeto
- `Table` / `TableHeader` / `TableBody` / `TableRow` / `TableCell` / `TableHead` - já existe
- `DropdownMenu` - para ações na tabela
- `Avatar` - para foto do cliente
- `Badge` - para risco e squad
- `Progress` ou barra customizada para saúde

