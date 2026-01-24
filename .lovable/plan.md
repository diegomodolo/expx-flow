
# Plano: Reorganizar Menu de Detalhes do Cliente em Grupos Expansíveis

## Visão Geral

Reorganizar os 27 itens de menu em 8 grupos lógicos expansíveis usando o componente `Collapsible` do shadcn/ui. Isso reduzirá a complexidade visual do menu e melhorará a navegação.

---

## Estrutura dos Grupos (com suas alterações)

### 1. Visão Geral (sempre visível, sem collapse)
- Dashboard
- Alertas & Sugestões

### 2. Análises & Relatórios
- Análise Completa
- Análise Competitiva
- Comparação de Períodos
- Relatório Semanal
- Tendências

### 3. Campanhas & Anúncios
- Campanhas
- Conjuntos de Anúncios
- Criativos
- Funil de Conversão
- **Automações** *(movido de Configurações)*

### 4. Meta & Rastreamento
- Pixels Meta
- Públicos Meta
- Conversões Offline
- URLs
- **Keyword Planner** *(movido de Criação de Conteúdo)*

### 5. Gestão de Leads
- CRM
- Leads Desqualificados

### 6. Criação de Conteúdo
- Fábrica de Anúncios
- Fábrica de Criativos
- Fábrica de Carrosseis
- **Redes Sociais** *(movido de Gestão de Leads)*

### 7. Apresentações & Planejamento
- Apresentações
- Tarefas

### 8. Configurações & Dados
- Contato & Dados
- Anotações
- Histórico

---

## Alterações Técnicas

### Arquivo a modificar

| Arquivo | Ação |
|---------|------|
| `src/components/clients/ClientDetailsLayout.tsx` | Modificar |

### Novos imports necessários

```typescript
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
```

### Nova estrutura de dados

Substituir o array `navItems` flat por uma estrutura agrupada:

```typescript
interface NavGroup {
  title: string;
  icon: LucideIcon;
  items: NavItem[];
  defaultOpen?: boolean;
}

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

const navGroups: NavGroup[] = [
  {
    title: "Visão Geral",
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { title: "Dashboard", href: `/clientes/${clientId}`, icon: LayoutDashboard },
      { title: "Alertas & Sugestões", href: `/clientes/${clientId}/alertas`, icon: AlertTriangle },
    ]
  },
  {
    title: "Análises & Relatórios",
    icon: BarChart3,
    items: [
      { title: "Análise Completa", href: `...`, icon: BarChart3 },
      { title: "Análise Competitiva", href: `...`, icon: Users },
      { title: "Comparação de Períodos", href: `...`, icon: GitCompare },
      { title: "Relatório Semanal", href: `...`, icon: FileText },
      { title: "Tendências", href: `...`, icon: TrendingUp },
    ]
  },
  // ... demais grupos
];
```

### Estado para controlar grupos abertos

```typescript
const [openGroups, setOpenGroups] = useState<string[]>(() => {
  // Abrir o grupo que contém a rota ativa por padrão
  const activeGroup = navGroups.find(group => 
    group.items.some(item => location.pathname === item.href)
  );
  return activeGroup ? [activeGroup.title, "Visão Geral"] : ["Visão Geral"];
});
```

### Componente de navegação atualizado

```typescript
<nav className="space-y-1">
  {navGroups.map((group) => {
    const isOpen = openGroups.includes(group.title);
    const hasActiveItem = group.items.some(item => location.pathname === item.href);
    const GroupIcon = group.icon;
    
    return (
      <Collapsible
        key={group.title}
        open={isOpen}
        onOpenChange={(open) => {
          setOpenGroups(prev => 
            open 
              ? [...prev, group.title]
              : prev.filter(g => g !== group.title)
          );
        }}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-md text-sm hover:bg-muted">
          <div className="flex items-center gap-2">
            <GroupIcon className="w-4 h-4" />
            <span className={cn(
              "font-medium",
              hasActiveItem && "text-primary"
            )}>
              {group.title}
            </span>
          </div>
          {isOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="ml-4 mt-1 space-y-1 border-l pl-3">
            {group.items.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  })}
</nav>
```

---

## Resultado Visual Esperado

```text
┌──────────────────────────────────┐
│ Cliente                          │
│ Nome do Cliente      [↔] [✎]    │
├──────────────────────────────────┤
│ ▼ Visão Geral                    │
│   ├─ Dashboard                   │
│   └─ Alertas & Sugestões         │
│                                  │
│ ▶ Análises & Relatórios          │
│                                  │
│ ▶ Campanhas & Anúncios           │
│                                  │
│ ▶ Meta & Rastreamento            │
│                                  │
│ ▶ Gestão de Leads                │
│                                  │
│ ▶ Criação de Conteúdo            │
│                                  │
│ ▶ Apresentações & Planejamento   │
│                                  │
│ ▶ Configurações & Dados          │
└──────────────────────────────────┘
```

---

## Comportamentos

1. **Visão Geral** sempre aberto por padrão
2. **Grupo ativo** (contendo a rota atual) abre automaticamente ao navegar
3. Múltiplos grupos podem ficar abertos simultaneamente
4. Ícone de chevron indica estado aberto/fechado
5. Indicador visual no título do grupo quando contém item ativo

---

## Resumo

| Item | Descrição |
|------|-----------|
| Arquivo | `src/components/clients/ClientDetailsLayout.tsx` |
| Ação | Modificar estrutura de navegação |
| Resultado | Menu reduzido de 27 itens visíveis para 8 grupos expansíveis |
