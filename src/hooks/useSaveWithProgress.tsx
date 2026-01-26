import { useState, useCallback } from 'react';

export interface SaveStep {
  id: 'sending' | 'waiting' | 'syncing' | 'complete';
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
}

interface UseSaveWithProgressReturn {
  isOpen: boolean;
  steps: SaveStep[];
  error: string | null;
  execute: (
    metaAction: () => Promise<any>,
    onSuccess?: () => Promise<void> | void
  ) => Promise<boolean>;
  close: () => void;
  reset: () => void;
}

const initialSteps: SaveStep[] = [
  { id: 'sending', label: 'Enviando para o Meta', status: 'pending' },
  { id: 'waiting', label: 'Aguardando resposta', status: 'pending' },
  { id: 'syncing', label: 'Atualizando dados locais', status: 'pending' },
  { id: 'complete', label: 'Concluído', status: 'pending' },
];

export function useSaveWithProgress(): UseSaveWithProgressReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<SaveStep[]>(initialSteps);

  const resetSteps = useCallback(() => {
    setSteps(initialSteps.map(s => ({ ...s, status: 'pending' })));
  }, []);

  const updateStep = useCallback((stepId: SaveStep['id'], status: SaveStep['status']) => {
    setSteps(prev => prev.map(s => 
      s.id === stepId ? { ...s, status } : s
    ));
  }, []);

  const markCurrentAsError = useCallback(() => {
    setSteps(prev => {
      const activeIndex = prev.findIndex(s => s.status === 'active');
      if (activeIndex >= 0) {
        return prev.map((s, i) => 
          i === activeIndex ? { ...s, status: 'error' } : s
        );
      }
      return prev;
    });
  }, []);

  const execute = useCallback(async (
    metaAction: () => Promise<any>,
    onSuccess?: () => Promise<void> | void
  ): Promise<boolean> => {
    setIsOpen(true);
    setError(null);
    resetSteps();

    try {
      // Etapa 1: Enviando para o Meta
      updateStep('sending', 'active');
      await new Promise(r => setTimeout(r, 300)); // pequeno delay visual
      
      // Etapa 2: Aguardando resposta do Meta
      updateStep('sending', 'complete');
      updateStep('waiting', 'active');
      
      // Executar a ação principal
      const result = await metaAction();
      
      // Etapa 3: Sincronizando dados locais (apenas visual, não faz refetch ainda)
      updateStep('waiting', 'complete');
      updateStep('syncing', 'active');
      
      // Pequeno delay visual para mostrar a etapa de sync
      await new Promise(r => setTimeout(r, 500));
      
      // Etapa 4: Concluído
      updateStep('syncing', 'complete');
      updateStep('complete', 'active');
      
      // Esperar 1s mostrando "Concluído"
      await new Promise(r => setTimeout(r, 1000));
      updateStep('complete', 'complete');
      
      // Fechar o modal PRIMEIRO
      setIsOpen(false);
      
      // DEPOIS de fechar o modal, fazer o refetch (isso evita o "flash" visual)
      if (onSuccess) {
        // Pequeno delay para garantir que o modal fechou visualmente
        await new Promise(r => setTimeout(r, 100));
        await onSuccess();
      }
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      markCurrentAsError();
      // Modal fica aberto para mostrar erro
      return false;
    }
  }, [resetSteps, updateStep, markCurrentAsError]);

  const close = useCallback(() => {
    setIsOpen(false);
    setError(null);
    resetSteps();
  }, [resetSteps]);

  const reset = useCallback(() => {
    setError(null);
    resetSteps();
  }, [resetSteps]);

  return { 
    isOpen, 
    steps, 
    error, 
    execute, 
    close,
    reset,
  };
}
