import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";

interface Conversation {
  id: string;
  client_id: string;
  company_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export function useAIChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const { toast } = useToast();

  // Fetch conversations
  const fetchConversations = async () => {
    if (!user || !activeCompany) return;

    try {
      const { data, error } = await supabase
        .from('ai_chat_conversations')
        .select('*')
        .eq('company_id', activeCompany.company_id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Erro ao carregar conversas",
        description: "Não foi possível carregar as conversas.",
        variant: "destructive",
      });
    }
  };

  // Fetch messages for a conversation
  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as Message[]);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Erro ao carregar mensagens",
        description: "Não foi possível carregar as mensagens.",
        variant: "destructive",
      });
    }
  };

  // Create new conversation
  const createConversation = async (clientId: string) => {
    if (!user || !activeCompany) return;

    try {
      const { data, error } = await supabase
        .from('ai_chat_conversations')
        .insert({
          client_id: clientId,
          company_id: activeCompany.company_id,
          user_id: user.id,
          title: 'Nova conversa'
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentConversation(data);
      setMessages([]);
      await fetchConversations();

      toast({
        title: "Nova conversa criada",
        description: "Você pode começar a conversar com a IA agora.",
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Erro ao criar conversa",
        description: "Não foi possível criar uma nova conversa.",
        variant: "destructive",
      });
    }
  };

  // Send message
  const sendMessage = async (message: string) => {
    if (!currentConversation || !activeCompany) return;

    setLoading(true);
    try {
      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          conversationId: currentConversation.id,
          message,
          clientId: currentConversation.client_id,
          companyId: activeCompany.company_id
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro desconhecido');
      }

      // Refresh messages
      await fetchMessages(currentConversation.id);
      await fetchConversations(); // Update conversations list to reflect updated_at

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro ao enviar mensagem",
        description: "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load conversation
  const loadConversation = async (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setCurrentConversation(conversation);
      await fetchMessages(conversationId);
    }
  };

  // Delete conversation
  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('ai_chat_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }

      toast({
        title: "Conversa excluída",
        description: "A conversa foi excluída com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Erro ao excluir conversa",
        description: "Não foi possível excluir a conversa.",
        variant: "destructive",
      });
    }
  };

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [user, activeCompany]);

  return {
    conversations,
    currentConversation,
    messages,
    loading,
    createConversation,
    sendMessage,
    loadConversation,
    deleteConversation,
    fetchConversations
  };
}