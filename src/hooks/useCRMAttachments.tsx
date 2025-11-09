import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CRMAttachment {
  id: string;
  lead_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string | null;
  created_at: string;
  is_private: boolean;
}

export const useCRMAttachments = (leadId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['crm-attachments', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_lead_attachments')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CRMAttachment[];
    },
    enabled: !!leadId,
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: async (file: File) => {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${leadId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('crm-lead-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('crm-lead-attachments')
        .getPublicUrl(fileName);

      // Create attachment record
      const { data, error } = await supabase
        .from('crm_lead_attachments')
        .insert({
          lead_id: leadId,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          file_type: file.type,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-attachments', leadId] });
      toast({
        title: "Arquivo enviado!",
        description: "O anexo foi adicionado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar arquivo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      // Get attachment to get file path
      const { data: attachment } = await supabase
        .from('crm_lead_attachments')
        .select('file_url')
        .eq('id', attachmentId)
        .single();

      if (attachment?.file_url) {
        // Extract file path from URL
        const urlParts = attachment.file_url.split('/crm-lead-attachments/');
        if (urlParts[1]) {
          await supabase.storage
            .from('crm-lead-attachments')
            .remove([urlParts[1]]);
        }
      }

      // Delete attachment record
      const { error } = await supabase
        .from('crm_lead_attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-attachments', leadId] });
      toast({
        title: "Anexo removido!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover anexo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    attachments,
    isLoading,
    uploadAttachment: uploadAttachmentMutation.mutateAsync,
    isUploading: uploadAttachmentMutation.isPending,
    deleteAttachment: deleteAttachmentMutation.mutateAsync,
    isDeleting: deleteAttachmentMutation.isPending,
  };
};
