
# Plano: Adicionar Edição de Campanhas, Conjuntos e Criativos no Editor

## Situação Atual

O `InspectorPanel` é um painel lateral read-only que exibe informações quando você clica em um item (campanha, conjunto ou criativo). Para transformar a tela do Editor em uma ferramenta completa de gestão, precisamos permitir edições diretamente desse painel.

---

## Solução Proposta

Transformar o `InspectorPanel` em um painel de edição completo com tabs para organizar as funcionalidades:
- **Tab Métricas** - Visão atual de performance (read-only)
- **Tab Configurações** - Campos editáveis (nome, status, orçamento, etc.)

O painel detectará o tipo do item (`campaign`, `adset`, `ad`) e mostrará campos específicos para cada um.

---

## Arquitetura

```text
InspectorPanel (Sheet)
├── Header (nome, status badge, tipo)
├── Tabs
│   ├── [Métricas] - Dados de performance
│   └── [Configurações] - Campos editáveis
│       ├── Campanha: nome, status, orçamento
│       ├── Conjunto: nome, status, orçamento diário
│       └── Criativo: nome, status
└── Footer (botão Salvar)
```

---

## Campos Editáveis por Tipo

### Campanha (`campaign`)
| Campo | API Meta | Edição Local |
|-------|----------|--------------|
| Nome | Sim (rename) | Sim |
| Status | Sim (toggle) | Sim |
| Orçamento diário | Sim (budget) | Sim |

### Conjunto de Anúncios (`adset`)
| Campo | API Meta | Edição Local |
|-------|----------|--------------|
| Nome | Sim (rename) | Sim |
| Status | Sim (toggle) | Sim |
| Orçamento diário | Sim (budget) | Sim |

### Anúncio/Criativo (`ad`)
| Campo | API Meta | Edição Local |
|-------|----------|--------------|
| Nome | Sim (rename) | Sim |
| Status | Sim (toggle) | Sim |

Nota: Campanhas Google terão edição apenas local (sem API)

---

## Componentes a Modificar/Criar

### 1. Modificar InspectorPanel.tsx
Adicionar:
- Sistema de tabs (Métricas / Configurações)
- Estado local para campos editáveis
- Inputs para nome, status toggle, budget
- Botão de salvar com loading state
- Integração com `useInlineEdit` hook

### 2. Modificar CampaignEditorPage.tsx
Passar props adicionais ao InspectorPanel:
- `clientId` para chamadas de API
- `onUpdate` callback para invalidar queries após edição

### 3. Utilizar hook existente: useInlineEdit
O hook já possui:
- `updateStatus(type, id, clientId, facebookId, newStatus, platform)`
- `updateBudget(type, id, clientId, facebookId, newBudget, budgetType, platform)`
- `updateName(type, id, clientId, facebookId, newName, platform)`

---

## Fluxo de Edição

```text
1. Usuário clica em item na árvore
2. InspectorPanel abre com dados do item
3. Usuário muda para tab "Configurações"
4. Usuário edita campos desejados
5. Usuário clica "Salvar Alterações"
6. Sistema:
   a. Se Meta: chama API do Facebook via Edge Function
   b. Atualiza banco local
   c. Mostra toast de sucesso
   d. Invalida queries para atualizar a árvore
7. Painel atualiza com novos dados
```

---

## Interface Visual do Painel

Tab Métricas (atual):
- Cards de métricas (spend, impressions, CTR, CPA, etc.)
- Seção de orçamento (read-only)
- Preview do criativo (para ads)

Tab Configurações (nova):
- Input para nome com validação
- Switch para ativar/pausar
- Input numérico para orçamento (quando aplicável)
- Informações da plataforma (Meta/Google)
- Alerta visual se Google (sem edição via API)

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/campaign-editor/InspectorPanel.tsx` | Adicionar tabs, campos editáveis, integração com useInlineEdit |
| `src/pages/cliente/CampaignEditorPage.tsx` | Passar clientId e callback de atualização ao InspectorPanel |

---

## Validações

1. Nome não pode ser vazio
2. Orçamento mínimo R$ 1,00
3. Desabilitar edição de orçamento para ads (não têm budget próprio)
4. Mostrar aviso visual para campanhas Google (edição apenas local)
5. Prevenir submit durante loading

---

## Notas de UX

- Tab "Configurações" só aparece se o item for editável
- Campos com alterações não salvas mostram indicador visual
- Botão salvar desabilitado se não houver alterações
- Após salvar, voltar automaticamente para tab Métricas
- Toast de feedback para sucesso/erro
