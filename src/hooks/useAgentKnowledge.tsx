import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

interface KnowledgeDocument {
  id: string;
  agent_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  content_text: string | null;
  uploaded_by: string;
  created_at: string;
}

export function useAgentKnowledge(agentId?: string) {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = async (id: string) => {
    if (!user || !activeCompany) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ia_agent_knowledge_documents')
        .select('*')
        .eq('agent_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Erro ao buscar documentos');
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (file: File) => {
    if (!user || !activeCompany || !agentId) return null;

    // Validações
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande. Máximo: 20MB');
      return null;
    }

    const allowedTypes = ['text/plain', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não suportado. Use TXT ou PDF');
      return null;
    }

    try {
      setUploading(true);
      
      // Upload para storage
      const filePath = `${activeCompany.company_id}/${agentId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('agent-knowledge')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Extrair conteúdo
      let contentText = '';
      
      if (file.type === 'text/plain') {
        contentText = await file.text();
      } else if (file.type === 'application/pdf') {
        // Usar parse_document tool para PDFs
        // Por enquanto, apenas salvamos o caminho
        toast.info('PDF carregado. O conteúdo será processado em breve.');
      }

      // Salvar metadata no banco
      const { data, error: dbError } = await supabase
        .from('ia_agent_knowledge_documents')
        .insert({
          agent_id: agentId,
          company_id: activeCompany.company_id,
          file_name: file.name,
          file_type: file.type === 'text/plain' ? 'txt' : 'pdf',
          file_size: file.size,
          storage_path: filePath,
          content_text: contentText || null,
          uploaded_by: user.id
        })
        .select()
        .single();

      if (dbError) throw dbError;

      toast.success('Documento carregado com sucesso');
      await fetchDocuments(agentId);
      return data;
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Erro ao fazer upload do documento');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (documentId: string, storagePath: string) => {
    if (!user || !activeCompany || !agentId) return false;

    try {
      // Deletar do storage
      const { error: storageError } = await supabase.storage
        .from('agent-knowledge')
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Deletar do banco
      const { error: dbError } = await supabase
        .from('ia_agent_knowledge_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      toast.success('Documento removido com sucesso');
      await fetchDocuments(agentId);
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Erro ao remover documento');
      return false;
    }
  };

  const getDocumentsContent = async (id: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('ia_agent_knowledge_documents')
        .select('content_text, file_name')
        .eq('agent_id', id);

      if (error) throw error;

      return data
        ?.filter(doc => doc.content_text)
        .map(doc => `[Documento: ${doc.file_name}]\n${doc.content_text}`)
        .join('\n\n---\n\n') || '';
    } catch (error) {
      console.error('Error getting documents content:', error);
      return '';
    }
  };

  useEffect(() => {
    if (agentId && user && activeCompany) {
      fetchDocuments(agentId);
    }
  }, [agentId, user?.id, activeCompany?.company_id]);

  return {
    documents,
    loading,
    uploading,
    uploadDocument,
    deleteDocument,
    getDocumentsContent,
    refetch: () => agentId && fetchDocuments(agentId)
  };
}
