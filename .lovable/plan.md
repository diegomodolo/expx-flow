
# Plano: Corrigir Gaps do Módulo CS e Torná-lo 100% Funcional

## Diagnóstico Completo

Após auditoria técnica, identifiquei os seguintes gaps entre a estrutura visual e a implementação lógica:

### Gaps Críticos Encontrados

| Área | Problema | Impacto |
|------|----------|---------|
| **Cockpit - Incêndios** | Botões WhatsApp/Ligar abrem URL vazia (`wa.me/`) | CS não consegue contatar cliente |
| **Cockpit - Tarefas** | Checkbox não persiste conclusão | Progresso do dia não funciona |
| **Cockpit - Tarefas** | Botão "Mandar Oi" abre WhatsApp vazio | CS não consegue enviar mensagem |
| **Ações** | Não existe botão global "Novo Touchpoint" | CS precisa buscar cliente em outra tela |
| **Ações** | Não existe botão "Coletar NPS" | CS não consegue iniciar coleta |
| **Carteira/Jornada** | Sem ações rápidas nos cards | Exige navegação extra |

---

## Fase 1: Integrar Telefones Reais nos Botões WhatsApp/Ligar

### O que fazer

Buscar telefone do cliente da tabela `whatsapp_client_contacts` e usar no botão de ação.

### Arquivos a Modificar

**1. `src/hooks/useCSCockpitData.tsx`**
- Adicionar campo `clientPhone` nas interfaces `FireAlert`, `DailyTask`, `Opportunity`
- Na query, fazer join com `whatsapp_client_contacts` para buscar telefone principal
- Retornar telefone formatado (5511999999999)

```typescript
// Adicionar ao select de clients:
const { data: contacts } = await supabase
  .from('whatsapp_client_contacts')
  .select('client_id, phone')
  .in('client_id', clientIds)
  .eq('is_active', true);

// Mapear por client_id
const phonesByClient = contacts?.reduce((acc, c) => {
  acc[c.client_id] = c.phone;
  return acc;
}, {} as Record<string, string>);

// Adicionar ao FireAlert, DailyTask:
clientPhone: phonesByClient[client.id] || null,
```

**2. `src/components/cs/CSCockpitFires.tsx`**
- Modificar `handleAction` para usar `fire.clientPhone`
- WhatsApp: `window.open(`https://wa.me/${fire.clientPhone}`, '_blank')`
- Se não tiver telefone, redirecionar para página do cliente

**3. `src/components/cs/CSCockpitTasks.tsx`**
- Mesma lógica para `task.clientPhone`

**4. `src/components/cs/CSCockpitOpportunities.tsx`**
- Mesma lógica para `opportunity.clientPhone`

---

## Fase 2: Implementar Marcação de Tarefas como Concluídas

### O que fazer

Criar sistema de persistência de tarefas concluídas (localStorage ou tabela) e implementar callback.

### Arquivos a Modificar

**1. `src/hooks/useCSCockpitData.tsx`**
- Adicionar estado local para tarefas concluídas
- Criar mutation `markTaskComplete` que salva no localStorage
- Atualizar lista de tarefas para marcar como completed

```typescript
// Usar localStorage para persistir
const completedTasksKey = `cs-completed-tasks-${new Date().toISOString().split('T')[0]}`;
const completedTasks = JSON.parse(localStorage.getItem(completedTasksKey) || '[]');

// Marcar tarefas
tasks.forEach(task => {
  task.completed = completedTasks.includes(task.id);
});
```

**2. `src/pages/cs/CSCockpitPage.tsx`**
- Adicionar função `handleTaskComplete`
- Passar para `CSCockpitTasks` via prop `onTaskComplete`
- Invalidar query após marcar

```typescript
const handleTaskComplete = (taskId: string) => {
  const key = `cs-completed-tasks-${new Date().toISOString().split('T')[0]}`;
  const current = JSON.parse(localStorage.getItem(key) || '[]');
  if (!current.includes(taskId)) {
    current.push(taskId);
    localStorage.setItem(key, JSON.stringify(current));
  }
  refetch();
};
```

---

## Fase 3: Adicionar Botões Globais na Tela de Ações

### O que fazer

Adicionar botões "+ Novo Touchpoint" e "+ Coletar NPS" no header da página de Ações.

### Arquivos a Modificar

**1. `src/pages/cs/CSActionsPage.tsx`**
- Adicionar dropdown "Selecionar Cliente" 
- Adicionar botões de ação no header
- Criar modal de NPS

```tsx
// Header atualizado
<div className="flex items-start justify-between">
  <div>
    <h1>Ações de CS</h1>
    <p>Touchpoints, NPS, QBR e Value Statements</p>
  </div>
  <div className="flex items-center gap-2">
    <CSSquadFilter />
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Ação
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => setShowClientSelector('touchpoint')}>
          <Phone className="h-4 w-4 mr-2" />
          Novo Touchpoint
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setShowClientSelector('nps')}>
          <Star className="h-4 w-4 mr-2" />
          Coletar NPS
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</div>
```

**2. Criar `src/components/cs/CSClientSelectorModal.tsx`**
- Modal com lista de clientes filtrados por squad
- Callback `onSelect(clientId)` para abrir modal específico

**3. Criar `src/components/cs/CSNPSCollectModal.tsx`**
- Modal para registrar NPS de um cliente
- Campos: Score (0-10), Feedback (opcional)
- Salvar na tabela `nps_responses`

---

## Fase 4: Registrar Touchpoint Automaticamente Após Ação

### O que fazer

Após clicar em WhatsApp/Ligar, abrir modal de registro de touchpoint automaticamente.

### Arquivos a Modificar

**1. `src/components/cs/CSCockpitFires.tsx`**
- Adicionar estado para modal de touchpoint
- Após abrir WhatsApp, abrir modal pré-preenchido

```typescript
const [showTouchpoint, setShowTouchpoint] = useState(false);
const [selectedFire, setSelectedFire] = useState<FireAlert | null>(null);

const handleAction = (fire: FireAlert, action: string) => {
  switch (action) {
    case 'whatsapp':
      if (fire.clientPhone) {
        window.open(`https://wa.me/${fire.clientPhone}`, '_blank');
        // Aguardar 2s e abrir modal de touchpoint
        setTimeout(() => {
          setSelectedFire(fire);
          setShowTouchpoint(true);
        }, 2000);
      } else {
        navigate(`/clientes/${fire.clientId}/cs`);
      }
      break;
    // ...
  }
};

// Render modal no final:
<CSNewTouchpointModal
  open={showTouchpoint}
  onOpenChange={setShowTouchpoint}
  clientId={selectedFire?.clientId || ''}
  clientName={selectedFire?.clientName}
  preselectedType="whatsapp" // Pré-selecionar tipo
/>
```

**2. `src/components/cs/CSNewTouchpointModal.tsx`**
- Aceitar prop `preselectedType` para pré-selecionar tipo

---

## Fase 5: Ações Rápidas nos Cards de Carteira e Jornada

### O que fazer

Adicionar dropdown de ações rápidas nos cards de clientes.

### Arquivos a Modificar

**1. `src/components/cs/CSHealthScore360Card.tsx`**
- Adicionar botão de ações no canto superior direito
- Dropdown com: WhatsApp, Registrar Touchpoint, Ver Cliente

**2. `src/pages/cs/CSJourneyKanbanPage.tsx`**
- No `ClientCard`, adicionar ações rápidas no hover
- Ações: WhatsApp, Ver Cliente, Avançar Etapa

---

## Resumo de Arquivos

### Criar (2 arquivos)
| Arquivo | Descrição |
|---------|-----------|
| `src/components/cs/CSClientSelectorModal.tsx` | Modal para selecionar cliente antes de ação |
| `src/components/cs/CSNPSCollectModal.tsx` | Modal para coletar NPS de cliente |

### Modificar (9 arquivos)
| Arquivo | Alterações |
|---------|------------|
| `src/hooks/useCSCockpitData.tsx` | Buscar telefones, adicionar lógica de tarefas concluídas |
| `src/pages/cs/CSCockpitPage.tsx` | Implementar `handleTaskComplete`, passar para componentes |
| `src/components/cs/CSCockpitFires.tsx` | Usar telefone real, abrir modal pós-contato |
| `src/components/cs/CSCockpitTasks.tsx` | Usar telefone real no WhatsApp |
| `src/components/cs/CSCockpitOpportunities.tsx` | Adicionar ações com telefone |
| `src/pages/cs/CSActionsPage.tsx` | Adicionar botões globais no header |
| `src/components/cs/CSNewTouchpointModal.tsx` | Aceitar `preselectedType` |
| `src/components/cs/CSHealthScore360Card.tsx` | Adicionar ações rápidas |
| `src/pages/cs/CSJourneyKanbanPage.tsx` | Adicionar ações no ClientCard |

---

## Fluxo Corrigido

Após implementação, o fluxo da CS será:

```text
1. CS abre Cockpit
   ↓
2. Vê "Incêndio: NPS 4 - Cliente X"
   ↓
3. Clica em "WhatsApp" 
   → Abre wa.me/5511999999999 (telefone real)
   → 2 segundos depois, modal aparece
   ↓
4. CS preenche resumo da conversa
   ↓
5. Clica "Registrar" 
   → Touchpoint salvo
   → last_cs_contact_at atualizado
   ↓
6. Volta ao Cockpit, marca tarefa como concluída
   → Checkbox atualiza
   → Barra de progresso avança
```

---

## Ordem de Implementação

1. **Fase 1** - Telefones reais (base para todas as ações)
2. **Fase 2** - Marcação de tarefas (gamificação funcional)
3. **Fase 3** - Botões globais em Ações (ponto de entrada centralizado)
4. **Fase 4** - Modal automático pós-contato (fluxo completo)
5. **Fase 5** - Ações rápidas nos cards (conveniência)
