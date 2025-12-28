import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface KnowledgeFile {
  id: string;
  config_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  content_text: string | null;
  processing_status: string;
  created_at: string;
}

export function usePDFKnowledge(configId: string, companyId: string) {
  const queryClient = useQueryClient();

  // Fetch saved PDF files for this config
  const { data: files = [], isLoading } = useQuery({
    queryKey: ['pdf-knowledge-files', configId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instagram_autopost_knowledge_files')
        .select('*')
        .eq('config_id', configId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as KnowledgeFile[];
    },
    enabled: !!configId
  });

  // Upload PDF file
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        throw new Error('Apenas arquivos PDF são permitidos');
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Arquivo muito grande. Máximo 10MB');
      }

      // Upload to storage
      const fileName = `${companyId}/${configId}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('instagram-knowledge-files')
        .upload(fileName, file, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL (or signed URL for private bucket)
      const { data: urlData } = await supabase.storage
        .from('instagram-knowledge-files')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

      const fileUrl = urlData?.signedUrl || '';

      // Create database record
      const { data, error } = await supabase
        .from('instagram_autopost_knowledge_files')
        .insert({
          config_id: configId,
          file_name: file.name,
          file_url: fileUrl,
          file_size: file.size,
          processing_status: 'pending',
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-knowledge-files', configId] });
      toast.success('PDF enviado com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao enviar PDF', { description: error.message });
    }
  });

  // Update PDF content text
  const updateContentMutation = useMutation({
    mutationFn: async ({ fileId, contentText }: { fileId: string; contentText: string }) => {
      const { error } = await supabase
        .from('instagram_autopost_knowledge_files')
        .update({ 
          content_text: contentText,
          processing_status: 'completed'
        })
        .eq('id', fileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-knowledge-files', configId] });
      toast.success('Conteúdo do PDF processado');
    },
    onError: (error: any) => {
      toast.error('Erro ao processar PDF', { description: error.message });
    }
  });

  // Delete PDF file
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      // First get the file to delete from storage
      const file = files.find(f => f.id === fileId);
      
      // Delete from database
      const { error } = await supabase
        .from('instagram_autopost_knowledge_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;

      // Try to delete from storage (best effort)
      if (file?.file_url) {
        try {
          const pathMatch = file.file_url.match(/instagram-knowledge-files\/(.+?)(?:\?|$)/);
          if (pathMatch) {
            await supabase.storage
              .from('instagram-knowledge-files')
              .remove([pathMatch[1]]);
          }
        } catch (e) {
          console.warn('Could not delete file from storage:', e);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-knowledge-files', configId] });
      toast.success('PDF removido da base de conhecimento');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover PDF', { description: error.message });
    }
  });

  const totalFiles = files.length;
  const processedFiles = files.filter(f => f.processing_status === 'completed').length;

  return {
    files,
    isLoading,
    totalFiles,
    processedFiles,
    uploadFile: uploadFileMutation.mutate,
    isUploading: uploadFileMutation.isPending,
    updateContent: updateContentMutation.mutate,
    isUpdatingContent: updateContentMutation.isPending,
    deleteFile: deleteFileMutation.mutate,
    isDeleting: deleteFileMutation.isPending
  };
}
