import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ScheduleSlot {
  id: string;
  config_id: string;
  day_of_week: number;
  hour: number;
  post_type: 'single' | 'carousel';
  carousel_images: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSlotParams {
  config_id: string;
  day_of_week: number;
  hour: number;
  post_type: 'single' | 'carousel';
  carousel_images?: number;
}

export interface UpdateSlotParams {
  slotId: string;
  post_type?: 'single' | 'carousel';
  carousel_images?: number;
  is_enabled?: boolean;
}

export function useInstagramScheduleSlots(configId: string) {
  const queryClient = useQueryClient();

  // Fetch all slots for a config
  const { data: slots, isLoading, error } = useQuery({
    queryKey: ['instagram-schedule-slots', configId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instagram_auto_post_schedules')
        .select('*')
        .eq('config_id', configId)
        .order('day_of_week')
        .order('hour');
      
      if (error) throw error;
      return data as ScheduleSlot[];
    },
    enabled: !!configId
  });

  // Create a new slot
  const createSlotMutation = useMutation({
    mutationFn: async (params: CreateSlotParams) => {
      const { data, error } = await supabase
        .from('instagram_auto_post_schedules')
        .insert({
          config_id: params.config_id,
          day_of_week: params.day_of_week,
          hour: params.hour,
          post_type: params.post_type,
          carousel_images: params.carousel_images || 5,
          is_enabled: true
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-schedule-slots', configId] });
      toast.success('Slot de agendamento criado');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Já existe um slot para este dia e horário');
      } else {
        toast.error('Erro ao criar slot');
      }
    }
  });

  // Update a slot
  const updateSlotMutation = useMutation({
    mutationFn: async (params: UpdateSlotParams) => {
      const updates: any = {};
      if (params.post_type !== undefined) updates.post_type = params.post_type;
      if (params.carousel_images !== undefined) updates.carousel_images = params.carousel_images;
      if (params.is_enabled !== undefined) updates.is_enabled = params.is_enabled;

      const { data, error } = await supabase
        .from('instagram_auto_post_schedules')
        .update(updates)
        .eq('id', params.slotId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-schedule-slots', configId] });
      toast.success('Slot atualizado');
    },
    onError: () => {
      toast.error('Erro ao atualizar slot');
    }
  });

  // Delete a slot
  const deleteSlotMutation = useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase
        .from('instagram_auto_post_schedules')
        .delete()
        .eq('id', slotId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-schedule-slots', configId] });
      toast.success('Slot removido');
    },
    onError: () => {
      toast.error('Erro ao remover slot');
    }
  });

  // Bulk create slots (for initial setup)
  const bulkCreateSlotsMutation = useMutation({
    mutationFn: async (slotsToCreate: CreateSlotParams[]) => {
      const { data, error } = await supabase
        .from('instagram_auto_post_schedules')
        .insert(slotsToCreate.map(s => ({
          config_id: s.config_id,
          day_of_week: s.day_of_week,
          hour: s.hour,
          post_type: s.post_type,
          carousel_images: s.carousel_images || 5,
          is_enabled: true
        })));
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-schedule-slots', configId] });
      toast.success('Slots criados com sucesso');
    },
    onError: () => {
      toast.error('Erro ao criar slots');
    }
  });

  // Get slots organized by day and hour
  const slotsByDayAndHour = slots?.reduce((acc, slot) => {
    const key = `${slot.day_of_week}-${slot.hour}`;
    acc[key] = slot;
    return acc;
  }, {} as Record<string, ScheduleSlot>) || {};

  // Get summary stats
  const singleCount = slots?.filter(s => s.post_type === 'single' && s.is_enabled).length || 0;
  const carouselCount = slots?.filter(s => s.post_type === 'carousel' && s.is_enabled).length || 0;
  const totalSlotsPerWeek = (singleCount + carouselCount);

  return {
    slots,
    slotsByDayAndHour,
    isLoading,
    error,
    createSlot: createSlotMutation.mutate,
    updateSlot: updateSlotMutation.mutate,
    deleteSlot: deleteSlotMutation.mutate,
    bulkCreateSlots: bulkCreateSlotsMutation.mutate,
    isCreating: createSlotMutation.isPending,
    isUpdating: updateSlotMutation.isPending,
    isDeleting: deleteSlotMutation.isPending,
    isBulkCreating: bulkCreateSlotsMutation.isPending,
    stats: {
      singleCount,
      carouselCount,
      totalSlotsPerWeek
    }
  };
}
