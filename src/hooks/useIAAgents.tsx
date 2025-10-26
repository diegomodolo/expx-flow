import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";

interface Agent {
  id: string;
  agent_name: string;
  description: string | null;
  prompt_base: string;
  additional_instructions: string | null;
  model: string;
  client_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Conversation {
  id: string;
  agent_id: string;
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

export function useIAAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const { toast } = useToast();

  // Buscar todos os agentes
  const fetchAgents = async () => {
    if (!activeCompany) return;

    try {
      const { data, error } = await supabase
        .from('ia_agents')
        .select('*')
        .eq('company_id', activeCompany.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: "Erro ao carregar agentes",
        description: "Não foi possível carregar os agentes.",
        variant: "destructive",
      });
    }
  };

  // Criar novo agente
  const createAgent = async (agentData: {
    agent_name: string;
    description?: string;
    prompt_base: string;
    additional_instructions?: string;
    model?: string;
    client_id?: string | null;
  }) => {
    if (!user || !activeCompany) return null;

    // Validação do prompt
    if (agentData.prompt_base.length < 50) {
      toast({
        title: "Prompt muito curto",
        description: "O prompt deve ter no mínimo 50 caracteres.",
        variant: "destructive",
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('ia_agents')
        .insert({
          ...agentData,
          company_id: activeCompany.company_id,
          user_id: user.id,
          model: agentData.model || 'google/gemini-2.5-flash'
        })
        .select()
        .single();

      if (error) throw error;

      // Adiciona o novo agente diretamente ao estado antes de buscar todos
      setAgents(prev => [data, ...prev]);

      toast({
        title: "Agente criado",
        description: "Agente criado com sucesso!",
      });

      return data;
    } catch (error) {
      console.error('Error creating agent:', error);
      toast({
        title: "Erro ao criar agente",
        description: "Não foi possível criar o agente.",
        variant: "destructive",
      });
      return null;
    }
  };

  // Atualizar agente
  const updateAgent = async (agentId: string, updates: Partial<Agent>) => {
    try {
      const { error } = await supabase
        .from('ia_agents')
        .update(updates)
        .eq('id', agentId);

      if (error) throw error;

      await fetchAgents();
      if (currentAgent?.id === agentId) {
        setCurrentAgent({ ...currentAgent, ...updates });
      }

      toast({
        title: "Agente atualizado",
        description: "Agente atualizado com sucesso!",
      });
    } catch (error) {
      console.error('Error updating agent:', error);
      toast({
        title: "Erro ao atualizar agente",
        description: "Não foi possível atualizar o agente.",
        variant: "destructive",
      });
    }
  };

  // Duplicar agente
  const duplicateAgent = async (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    await createAgent({
      agent_name: `${agent.agent_name} (Cópia)`,
      description: agent.description || undefined,
      prompt_base: agent.prompt_base,
      additional_instructions: agent.additional_instructions || undefined,
      model: agent.model
    });
  };

  // Excluir agente
  const deleteAgent = async (agentId: string) => {
    try {
      const { error } = await supabase
        .from('ia_agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;

      setAgents(prev => prev.filter(a => a.id !== agentId));
      
      if (currentAgent?.id === agentId) {
        setCurrentAgent(null);
        setCurrentConversation(null);
        setMessages([]);
      }

      toast({
        title: "Agente excluído",
        description: "Agente excluído com sucesso!",
      });
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast({
        title: "Erro ao excluir agente",
        description: "Não foi possível excluir o agente.",
        variant: "destructive",
      });
    }
  };

  // Buscar conversas de um agente
  const fetchConversations = async (agentId: string) => {
    try {
      const { data, error } = await supabase
        .from('ia_agent_conversations')
        .select('*')
        .eq('agent_id', agentId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  // Criar nova conversa
  const createConversation = async (agentId: string) => {
    if (!user || !activeCompany) return;

    try {
      const { data, error } = await supabase
        .from('ia_agent_conversations')
        .insert({
          agent_id: agentId,
          company_id: activeCompany.company_id,
          user_id: user.id,
          title: 'Nova conversa'
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentConversation(data);
      setMessages([]);
      await fetchConversations(agentId);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Erro ao criar conversa",
        description: "Não foi possível criar uma nova conversa.",
        variant: "destructive",
      });
    }
  };

  // Buscar mensagens
  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('ia_agent_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as Message[]);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Enviar mensagem
  const sendMessage = async (message: string) => {
    if (!currentConversation || !currentAgent) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ia-agent-chat', {
        body: {
          conversationId: currentConversation.id,
          message,
          agentId: currentAgent.id
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro desconhecido');
      }

      await fetchMessages(currentConversation.id);
      await fetchConversations(currentAgent.id);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro ao enviar mensagem",
        description: "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Carregar agente
  const loadAgent = async (agentId: string) => {
    // Primeiro tenta encontrar no array já carregado
    let agent = agents.find(a => a.id === agentId);
    
    // Se não encontrar, busca direto do banco
    if (!agent) {
      try {
        const { data, error } = await supabase
          .from('ia_agents')
          .select('*')
          .eq('id', agentId)
          .single();
        
        if (error) throw error;
        agent = data;
        
        // Atualiza a lista local também
        setAgents(prev => {
          const exists = prev.find(a => a.id === agentId);
          if (exists) return prev;
          return [data, ...prev];
        });
      } catch (error) {
        console.error('Error loading agent:', error);
        toast({
          title: "Erro ao carregar agente",
          description: "Não foi possível carregar o agente.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setCurrentAgent(agent);
    await fetchConversations(agentId);
  };

  // Carregar conversa
  const loadConversation = async (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setCurrentConversation(conversation);
      await fetchMessages(conversationId);
    }
  };

  // Renomear conversa
  const renameConversation = async (conversationId: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from('ia_agent_conversations')
        .update({ title: newTitle })
        .eq('id', conversationId);

      if (error) throw error;

      // Atualiza o estado local
      setConversations(prev => 
        prev.map(c => c.id === conversationId ? { ...c, title: newTitle } : c)
      );
      
      // Atualiza a conversa atual se for a mesma
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(prev => prev ? { ...prev, title: newTitle } : null);
      }

      toast({
        title: "Conversa renomeada",
        description: "O título da conversa foi atualizado.",
      });
    } catch (error) {
      console.error('Error renaming conversation:', error);
      toast({
        title: "Erro ao renomear conversa",
        description: "Não foi possível renomear a conversa.",
        variant: "destructive",
      });
    }
  };

  // Excluir conversa
  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('ia_agent_conversations')
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
        description: "Conversa excluída com sucesso!",
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

  useEffect(() => {
    fetchAgents();
  }, [activeCompany]);

  return {
    agents,
    currentAgent,
    conversations,
    currentConversation,
    messages,
    loading,
    createAgent,
    updateAgent,
    duplicateAgent,
    deleteAgent,
    loadAgent,
    createConversation,
    loadConversation,
    renameConversation,
    deleteConversation,
    sendMessage
  };
}
