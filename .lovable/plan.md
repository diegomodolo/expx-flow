
# Plano: Modal de Status de Salvamento com Feedback Visual em Etapas

## Objetivo

Criar um modal de progresso que aparece ao clicar em "Salvar" no editor de campanhas/conjuntos/anúncios, mostrando cada etapa do processo em tempo real para dar feedback claro ao usuário.

---

## Análise do Fluxo Atual

### Como funciona hoje
1. Usuário clica em "Salvar"
2. `handleSave()` é executado com `isSaving = true` (mostra apenas "Salvando...")
3. Chama edge function para atualizar no Meta
4. Edge function atualiza banco local após sucesso
5. Toast de sucesso aparece
6. `onSuccess()` é chamado (refetch dos dados)

### Problema
- O feedback é genérico ("Salvando...")
- Usuário não sabe se está enviando para Meta, aguardando resposta, ou sincronizando
- Parece que nada aconteceu até aparecer o toast final

---

## Solução Proposta

### 1. Criar componente `SaveProgressModal`

Modal pequeno que mostra as etapas do processo:

| Etapa | Status Visual |
|-------|---------------|
| Enviando para o Meta | Spinner animado |
| Aguardando resposta do Meta | Spinner ou check |
| Atualizando dados locais | Spinner ou check |
| Concluído | Check verde + fechar automático |

### 2. Criar hook `useSaveWithProgress`

Hook que encapsula a lógica de salvamento com controle de etapas:

```typescript
interface SaveStep {
  id: 'sending' | 'waiting' | 'syncing' | 'complete';
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
}

interface UseSaveWithProgressReturn {
  isOpen: boolean;
  steps: SaveStep[];
  error: string | null;
  execute: (saveFn: () => Promise<void>) => Promise<void>;
  close: () => void;
}
```

### 3. Modificar componentes de edição

Integrar o hook em:
- `CampaignEditContent.tsx`
- `AdSetEditContent.tsx`
- `AdEditContent.tsx`

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────┐
│         Modal de Edição (atual)                 │
│  ┌───────────────────────────────────────────┐  │
│  │  Formulário de edição                     │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  [Salvar]  → abre SaveProgressModal       │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│         SaveProgressModal (overlay)             │
│  ┌───────────────────────────────────────────┐  │
│  │  ○ Enviando para o Meta...      [spinner] │  │
│  │  ○ Aguardando resposta          [pending] │  │
│  │  ○ Atualizando dados            [pending] │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│         Atualizando alterações...               │
└─────────────────────────────────────────────────┘
```

---

## Implementação Técnica

### Arquivo 1: `src/components/campaign-editor/SaveProgressModal.tsx`

Componente visual do modal com as etapas:

```typescript
interface SaveProgressModalProps {
  isOpen: boolean;
  steps: SaveStep[];
  error: string | null;
  onClose: () => void;
}

export function SaveProgressModal({ isOpen, steps, error, onClose }: SaveProgressModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Salvando alterações</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-3">
              {step.status === 'active' && <Loader2 className="animate-spin" />}
              {step.status === 'complete' && <CheckCircle className="text-green-500" />}
              {step.status === 'pending' && <Circle className="text-muted" />}
              {step.status === 'error' && <XCircle className="text-destructive" />}
              <span className={cn(
                step.status === 'active' && 'font-medium',
                step.status === 'pending' && 'text-muted-foreground',
                step.status === 'complete' && 'text-green-600'
              )}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

### Arquivo 2: `src/hooks/useSaveWithProgress.tsx`

Hook para gerenciar o estado das etapas:

```typescript
export function useSaveWithProgress() {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<SaveStep[]>([
    { id: 'sending', label: 'Enviando para o Meta', status: 'pending' },
    { id: 'waiting', label: 'Aguardando resposta', status: 'pending' },
    { id: 'syncing', label: 'Atualizando dados locais', status: 'pending' },
    { id: 'complete', label: 'Concluído', status: 'pending' },
  ]);

  const updateStep = (stepId: string, status: SaveStep['status']) => {
    setSteps(prev => prev.map(s => 
      s.id === stepId ? { ...s, status } : s
    ));
  };

  const execute = async (
    metaAction: () => Promise<any>,
    onSuccess?: () => void
  ) => {
    setIsOpen(true);
    setError(null);
    resetSteps();

    try {
      // Etapa 1: Enviando
      updateStep('sending', 'active');
      await new Promise(r => setTimeout(r, 300)); // pequeno delay visual
      
      // Etapa 2: Aguardando resposta do Meta
      updateStep('sending', 'complete');
      updateStep('waiting', 'active');
      
      const result = await metaAction();
      
      // Etapa 3: Sincronizando dados locais
      updateStep('waiting', 'complete');
      updateStep('syncing', 'active');
      
      // O onSuccess geralmente faz refetch dos dados
      await onSuccess?.();
      
      // Etapa 4: Concluído
      updateStep('syncing', 'complete');
      updateStep('complete', 'active');
      
      // Fechar após 1.5s
      setTimeout(() => {
        updateStep('complete', 'complete');
        setIsOpen(false);
      }, 1500);
      
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      // Marcar etapa atual como erro
      // Modal fica aberto para mostrar erro
    }
  };

  return { isOpen, steps, error, execute, close: () => setIsOpen(false) };
}
```

### Arquivo 3-5: Modificar componentes de edição

Em cada componente (`CampaignEditContent`, `AdSetEditContent`, `AdEditContent`):

```typescript
// Adicionar import
import { SaveProgressModal } from './SaveProgressModal';
import { useSaveWithProgress } from '@/hooks/useSaveWithProgress';

// No componente
const saveProgress = useSaveWithProgress();

// Modificar handleSave
const handleSave = useCallback(async () => {
  if (!clientId || !node) return;

  const metaAction = async () => {
    // ... lógica atual de chamada ao Meta
  };

  await saveProgress.execute(metaAction, onSuccess);
}, [...]);

// No JSX, antes do fechamento do Dialog
<SaveProgressModal
  isOpen={saveProgress.isOpen}
  steps={saveProgress.steps}
  error={saveProgress.error}
  onClose={saveProgress.close}
/>
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/campaign-editor/SaveProgressModal.tsx` | **Criar** |
| `src/hooks/useSaveWithProgress.tsx` | **Criar** |
| `src/components/campaign-editor/CampaignEditContent.tsx` | **Modificar** |
| `src/components/campaign-editor/AdSetEditContent.tsx` | **Modificar** |
| `src/components/campaign-editor/AdEditContent.tsx` | **Modificar** |

---

## Comportamento Visual

### Durante o salvamento
- Modal abre imediatamente ao clicar em Salvar
- Cada etapa fica "ativa" (com spinner) conforme progride
- Etapas completadas mostram check verde
- Etapas pendentes ficam cinza

### Em caso de sucesso
- Última etapa "Concluído" fica verde
- Modal fecha automaticamente após 1.5 segundos
- Dados já estão atualizados na tabela atrás

### Em caso de erro
- Etapa que falhou fica vermelha
- Mensagem de erro aparece no modal
- Modal permanece aberto para usuário ver o erro
- Botão de fechar disponível

---

## Resultado Esperado

O usuário terá feedback visual claro de cada etapa:
1. "Enviando para o Meta" - indica que a requisição está sendo enviada
2. "Aguardando resposta" - indica que está esperando confirmação do Meta
3. "Atualizando dados locais" - indica que está salvando no banco
4. "Concluído" - indica sucesso total

Isso elimina a sensação de "não aconteceu nada" e mostra claramente que o processo está funcionando.
