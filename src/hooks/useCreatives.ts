import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { PresentationCreative, CreativeMedia } from "./usePresentations";

export function useCreatives(presentationId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createCreative = useMutation({
    mutationFn: async (creative: Omit<PresentationCreative, 'id' | 'created_at' | 'updated_at' | 'creative_media'>) => {
      const { data, error } = await supabase
        .from('presentation_creatives')
        .insert(creative)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentation', presentationId] });
      toast({
        title: "Criativo adicionado",
        description: "O criativo foi adicionado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCreative = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PresentationCreative> & { id: string }) => {
      const { data, error } = await supabase
        .from('presentation_creatives')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentation', presentationId] });
    },
  });

  const deleteCreative = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('presentation_creatives')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentation', presentationId] });
      toast({
        title: "Criativo excluído",
        description: "O criativo foi excluído com sucesso.",
      });
    },
  });

  const reorderCreatives = useMutation({
    mutationFn: async (creatives: { id: string; order_index: number }[]) => {
      const updates = creatives.map(c => 
        supabase
          .from('presentation_creatives')
          .update({ order_index: c.order_index })
          .eq('id', c.id)
      );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentation', presentationId] });
    },
  });

  return {
    createCreative,
    updateCreative,
    deleteCreative,
    reorderCreatives,
  };
}

export function useCreativeMedia(creativeId: string, presentationId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addMedia = useMutation({
    mutationFn: async (media: Omit<CreativeMedia, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('creative_media')
        .insert(media)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentation', presentationId] });
    },
  });

  const updateMedia = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreativeMedia> & { id: string }) => {
      const { data, error } = await supabase
        .from('creative_media')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentation', presentationId] });
    },
  });

  const deleteMedia = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('creative_media')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentation', presentationId] });
    },
  });

  const uploadMedia = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${presentationId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('presentation-media')
      .upload(filePath, file, {
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('presentation-media')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  return {
    addMedia,
    updateMedia,
    deleteMedia,
    uploadMedia,
  };
}
