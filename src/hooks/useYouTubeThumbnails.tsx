import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ThumbnailConfig {
  id: string;
  client_id: string;
  company_id: string;
  model_photos: string[];
  reference_thumbnails: string[];
  style_notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useYouTubeThumbnails(clientId: string, companyId: string) {
  const [config, setConfig] = useState<ThumbnailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const fetchConfig = useCallback(async () => {
    if (!clientId || !companyId) return;

    try {
      const { data, error } = await supabase
        .from('youtube_thumbnail_configs')
        .select('*')
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          ...data,
          model_photos: Array.isArray(data.model_photos) 
            ? (data.model_photos as unknown as string[]) 
            : [],
          reference_thumbnails: Array.isArray(data.reference_thumbnails) 
            ? (data.reference_thumbnails as unknown as string[]) 
            : [],
        });
      }
    } catch (error) {
      console.error('Error fetching thumbnail config:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, companyId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const uploadImage = async (file: File, type: 'model' | 'reference'): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${clientId}/${type}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('visual-creatives')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('visual-creatives')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Erro ao fazer upload',
        description: 'Não foi possível fazer upload da imagem.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const saveConfig = async (updates: Partial<ThumbnailConfig>) => {
    setSaving(true);
    try {
      if (config?.id) {
        // Update existing
        const { error } = await supabase
          .from('youtube_thumbnail_configs')
          .update({
            model_photos: updates.model_photos,
            reference_thumbnails: updates.reference_thumbnails,
            style_notes: updates.style_notes,
          })
          .eq('id', config.id);

        if (error) throw error;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('youtube_thumbnail_configs')
          .insert({
            client_id: clientId,
            company_id: companyId,
            model_photos: updates.model_photos || [],
            reference_thumbnails: updates.reference_thumbnails || [],
            style_notes: updates.style_notes || null,
          })
          .select()
          .single();

        if (error) throw error;
        
        if (data) {
          setConfig({
            ...data,
            model_photos: Array.isArray(data.model_photos) 
              ? (data.model_photos as unknown as string[]) 
              : [],
            reference_thumbnails: Array.isArray(data.reference_thumbnails) 
              ? (data.reference_thumbnails as unknown as string[]) 
              : [],
          });
        }
      }

      toast({
        title: 'Configurações salvas!',
      });

      await fetchConfig();
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const generateThumbnail = async (
    scriptId: string,
    title: string,
    scriptContent: string,
    suggestedTitles: string[]
  ): Promise<string | null> => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-youtube-thumbnail', {
        body: {
          scriptId,
          title,
          scriptContent,
          suggestedTitles,
          clientId,
          companyId,
          modelPhotos: config?.model_photos || [],
          referenceThumbnails: config?.reference_thumbnails || [],
          styleNotes: config?.style_notes || '',
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao gerar thumbnail');

      toast({
        title: 'Thumbnail gerada!',
        description: 'A thumbnail foi criada com sucesso.',
      });

      return data.imageUrl;
    } catch (error: any) {
      console.error('Error generating thumbnail:', error);
      toast({
        title: 'Erro ao gerar thumbnail',
        description: error.message || 'Não foi possível gerar a thumbnail.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setGenerating(false);
    }
  };

  return {
    config,
    loading,
    saving,
    generating,
    uploadImage,
    saveConfig,
    generateThumbnail,
    refetch: fetchConfig,
  };
}
