import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface VideoGenerationState {
  creativeId: string | null;
  operationName: string | null;
  status: 'idle' | 'generating' | 'completed' | 'error';
  videoUrl: string | null;
  progress: number;
  error: string | null;
  estimatedTime: number;
}

interface StartVideoGenerationParams {
  clientId: string;
  companyId: string;
  theme: string;
  creativeType?: string;
  aspectRatio?: string;
  duration?: number;
  model?: 'veo-2.0' | 'veo-3.1';
  imageReference?: string;
  clientName?: string;
  title?: string;
  description?: string;
}

export function useVideoGeneration() {
  const { toast } = useToast();
  const [state, setState] = useState<VideoGenerationState>({
    creativeId: null,
    operationName: null,
    status: 'idle',
    videoUrl: null,
    progress: 0,
    error: null,
    estimatedTime: 60,
  });
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Limpar polling ao desmontar
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Iniciar geração de vídeo
  const startGeneration = useCallback(async (params: StartVideoGenerationParams) => {
    setState(prev => ({
      ...prev,
      status: 'generating',
      progress: 0,
      error: null,
      videoUrl: null,
    }));
    startTimeRef.current = Date.now();

    try {
      const { data, error } = await supabase.functions.invoke('generate-video-creative', {
        method: 'POST',
        body: params,
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to start video generation');
      }

      setState(prev => ({
        ...prev,
        creativeId: data.creativeId,
        operationName: data.operationName,
        estimatedTime: data.estimatedTime || 60,
      }));

      toast({
        title: 'Geração iniciada',
        description: `Estimativa: ${Math.ceil(data.estimatedTime / 60)} minuto(s)`,
      });

      // Iniciar polling
      startPolling(data.operationName, data.creativeId);

      return data;
    } catch (error: any) {
      console.error('Video generation error:', error);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error.message || 'Erro ao iniciar geração',
      }));

      toast({
        title: 'Erro na geração',
        description: error.message,
        variant: 'destructive',
      });

      throw error;
    }
  }, [toast]);

  // Polling para verificar status
  const startPolling = useCallback((operationName: string, creativeId: string) => {
    // Limpar polling anterior
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    const pollInterval = 10000; // 10 segundos
    let pollCount = 0;
    const maxPolls = 60; // 10 minutos máximo

    const poll = async () => {
      pollCount++;
      
      // Atualizar progresso estimado
      const elapsed = Date.now() - (startTimeRef.current || Date.now());
      const estimatedMs = state.estimatedTime * 1000;
      const progress = Math.min(95, Math.round((elapsed / estimatedMs) * 100));
      
      setState(prev => ({ ...prev, progress }));

      try {
        const { data, error } = await supabase.functions.invoke('generate-video-creative', {
          method: 'GET',
          body: {},
          headers: {},
        });

        // Como o invoke não suporta GET params diretamente, usar fetch direto
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video-creative?operationName=${encodeURIComponent(operationName)}&creativeId=${creativeId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const statusData = await response.json();

        if (statusData.done) {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;

          if (statusData.error) {
            setState(prev => ({
              ...prev,
              status: 'error',
              error: statusData.error,
              progress: 0,
            }));

            toast({
              title: 'Erro na geração',
              description: statusData.error,
              variant: 'destructive',
            });
          } else {
            setState(prev => ({
              ...prev,
              status: 'completed',
              videoUrl: statusData.videoUrl,
              progress: 100,
            }));

            toast({
              title: 'Vídeo gerado!',
              description: 'Seu vídeo está pronto para visualização.',
            });
          }
        }
      } catch (error: any) {
        console.error('Polling error:', error);
        // Não parar o polling por erro de rede, apenas logar
      }

      // Verificar se excedeu tempo máximo
      if (pollCount >= maxPolls) {
        clearInterval(pollingRef.current!);
        pollingRef.current = null;
        
        setState(prev => ({
          ...prev,
          status: 'error',
          error: 'Tempo limite excedido. Por favor, tente novamente.',
          progress: 0,
        }));

        toast({
          title: 'Tempo limite excedido',
          description: 'A geração demorou mais que o esperado.',
          variant: 'destructive',
        });
      }
    };

    // Primeira verificação após 15 segundos
    setTimeout(poll, 15000);
    
    // Depois a cada 10 segundos
    pollingRef.current = setInterval(poll, pollInterval);
  }, [state.estimatedTime, toast]);

  // Cancelar geração
  const cancelGeneration = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    setState({
      creativeId: null,
      operationName: null,
      status: 'idle',
      videoUrl: null,
      progress: 0,
      error: null,
      estimatedTime: 60,
    });
  }, []);

  // Reset state
  const reset = useCallback(() => {
    cancelGeneration();
  }, [cancelGeneration]);

  return {
    state,
    startGeneration,
    cancelGeneration,
    reset,
    isGenerating: state.status === 'generating',
    isCompleted: state.status === 'completed',
    isError: state.status === 'error',
  };
}
