import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface QuickReply {
  id: string;
  shortCut: string;
  type: 'text' | 'audio' | 'myaudio' | 'ptt' | 'document' | 'video' | 'image';
  text?: string;
  file?: string;
  docName?: string;
  onWhatsApp?: boolean;
}

export interface QuickReplyInput {
  id?: string;
  shortCut: string;
  type: 'text' | 'audio' | 'myaudio' | 'ptt' | 'document' | 'video' | 'image';
  text?: string;
  file?: string;
  docName?: string;
}

export const useWhatsAppQuickReplies = (instanceId: string | null) => {
  const queryClient = useQueryClient();

  const {
    data: quickReplies = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['whatsapp-quick-replies', instanceId],
    queryFn: async () => {
      if (!instanceId) return [];

      const { data, error } = await supabase.functions.invoke('fetch-whatsapp-quick-replies', {
        body: { instanceId }
      });

      if (error) throw error;
      return (data?.quickReplies || []) as QuickReply[];
    },
    enabled: !!instanceId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: async (quickReply: QuickReplyInput) => {
      if (!instanceId) throw new Error('Instance ID is required');

      const { data, error } = await supabase.functions.invoke('manage-whatsapp-quick-reply', {
        body: {
          instanceId,
          action: 'create',
          quickReply
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-quick-replies', instanceId] });
      toast.success('Resposta rápida criada com sucesso');
    },
    onError: (error: any) => {
      console.error('Error creating quick reply:', error);
      toast.error('Erro ao criar resposta rápida');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (quickReply: QuickReplyInput) => {
      if (!instanceId) throw new Error('Instance ID is required');
      if (!quickReply.id) throw new Error('Quick reply ID is required for update');

      const { data, error } = await supabase.functions.invoke('manage-whatsapp-quick-reply', {
        body: {
          instanceId,
          action: 'update',
          quickReply
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-quick-replies', instanceId] });
      toast.success('Resposta rápida atualizada com sucesso');
    },
    onError: (error: any) => {
      console.error('Error updating quick reply:', error);
      toast.error('Erro ao atualizar resposta rápida');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (quickReplyId: string) => {
      if (!instanceId) throw new Error('Instance ID is required');

      // Find the quick reply to get its details
      const quickReply = quickReplies.find(qr => qr.id === quickReplyId);
      if (!quickReply) throw new Error('Quick reply not found');

      if (quickReply.onWhatsApp) {
        throw new Error('Não é possível excluir templates originados do WhatsApp');
      }

      const { data, error } = await supabase.functions.invoke('manage-whatsapp-quick-reply', {
        body: {
          instanceId,
          action: 'delete',
          quickReply: {
            id: quickReplyId,
            shortCut: quickReply.shortCut,
            type: quickReply.type
          }
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-quick-replies', instanceId] });
      toast.success('Resposta rápida excluída com sucesso');
    },
    onError: (error: any) => {
      console.error('Error deleting quick reply:', error);
      toast.error(error.message || 'Erro ao excluir resposta rápida');
    }
  });

  const getQuickReplyByShortcut = (shortcut: string): QuickReply | undefined => {
    return quickReplies.find(qr => 
      qr.shortCut.toLowerCase() === shortcut.toLowerCase()
    );
  };

  const filterQuickReplies = (search: string): QuickReply[] => {
    if (!search) return quickReplies;
    const lowerSearch = search.toLowerCase();
    return quickReplies.filter(qr =>
      qr.shortCut.toLowerCase().includes(lowerSearch) ||
      (qr.text && qr.text.toLowerCase().includes(lowerSearch))
    );
  };

  return {
    quickReplies,
    isLoading,
    error,
    refetch,
    createQuickReply: createMutation.mutateAsync,
    updateQuickReply: updateMutation.mutateAsync,
    deleteQuickReply: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    getQuickReplyByShortcut,
    filterQuickReplies
  };
};
