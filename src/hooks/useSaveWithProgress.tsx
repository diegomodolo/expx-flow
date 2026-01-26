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
      
      // Etapa 3: Sincronizando dados locais - AGUARDA a invalidação completar
      updateStep('waiting', 'complete');
      updateStep('syncing', 'active');
      
      // Executar o callback de sucesso que faz invalidação/refetch
      if (onSuccess) {
        await onSuccess();
      }
      
      // Etapa 4: Concluído - só mostra depois que os dados foram atualizados
      updateStep('syncing', 'complete');
      updateStep('complete', 'active');
      
      // Breve delay visual para mostrar "Concluído"
      await new Promise(r => setTimeout(r, 800));
      updateStep('complete', 'complete');
      
      // Fechar o modal
      setIsOpen(false);
      
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
