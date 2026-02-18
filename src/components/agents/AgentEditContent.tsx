import React, { useEffect, useState } from "react";
import { SearchableClientSelect } from "@/components/ui/searchable-client-select";
import { Settings, Brain, FileText, Bot, Puzzle, MessageCircle, Save, UserCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useIAAgents } from "@/hooks/useIAAgents";
import { useClients } from "@/hooks/useClients";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { KnowledgeDocumentsManager } from "@/components/agents/KnowledgeDocumentsManager";
import { TelegramBotConfig } from "@/components/agents/TelegramBotConfig";
import { AgentSkillsConfig } from "@/components/agents/AgentSkillsConfig";
import { PromptSkillInjector } from "@/components/agents/PromptSkillInjector";
import { ChatMessages } from "@/components/ai-chat/ChatMessages";
import { ChatInput } from "@/components/ai-chat/ChatInput";
import { AgentConversationsSidebar } from "@/components/agents/AgentConversationsSidebar";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Section = "chat" | "geral" | "prompt" | "conhecimento" | "skills" | "telegram";

const menuItems: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "geral", label: "Geral", icon: Settings },
  { id: "prompt", label: "Prompt & Instruções", icon: Brain },
  { id: "conhecimento", label: "Conhecimento", icon: FileText },
  { id: "skills", label: "Skills", icon: Puzzle },
  { id: "telegram", label: "Telegram Bot", icon: Bot },
];

interface AgentEditContentProps {
  agentId: string;
  defaultSection?: Section;
  showChat?: boolean;
  onSaved?: () => void;
}

export function AgentEditContent({
  agentId,
  defaultSection = "geral",
  showChat = true,
  onSaved,
}: AgentEditContentProps) {
  const {
    currentAgent,
    conversations,
    currentConversation,
    messages,
    loading,
    loadAgent,
    updateAgent,
    createConversation,
    loadConversation,
    renameConversation,
    deleteConversation,
    sendMessage,
  } = useIAAgents();
  const { clients } = useClients();
  const { activeCompany } = useCompany();
  
  const syncCollaboratorStatus = async (agentId: string, isCollaborator: boolean, agentName: string) => {
    if (!activeCompany?.company_id) return;
    
    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('id')
      .eq('ia_agent_id', agentId as any)
      .eq('company_id', activeCompany.company_id)
      .maybeSingle();
    
    if (isCollaborator && !existingEmployee) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('employees').insert({
        company_id: activeCompany.company_id,
        name: `🤖 ${agentName}`,
        email: `agent-${agentId}@ai.internal`,
        role: 'Agente IA',
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        user_id: user?.id || '',
        ia_agent_id: agentId,
      } as any);
    } else if (!isCollaborator && existingEmployee) {
      await supabase.from('employees').delete().eq('id', existingEmployee.id);
    } else if (isCollaborator && existingEmployee) {
      await supabase.from('employees').update({
        name: `🤖 ${agentName}`,
      }).eq('id', existingEmployee.id);
    }
  };

  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>(defaultSection);
  const [formData, setFormData] = useState({
    agent_name: "",
    description: "",
    prompt_base: "",
    additional_instructions: "",
    client_id: "none",
    is_collaborator: false,
  });
  const [showWarning, setShowWarning] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const handleInsertSkill = (skillTag: string) => {
    const textarea = promptRef.current;
    if (!textarea) {
      setFormData(prev => ({ ...prev, prompt_base: prev.prompt_base + " " + skillTag }));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.prompt_base;
    const newText = text.substring(0, start) + skillTag + text.substring(end);
    setFormData(prev => ({ ...prev, prompt_base: newText }));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + skillTag.length, start + skillTag.length);
    }, 0);
  };

  useEffect(() => {
    if (agentId) {
      loadAgent(agentId);
    }
  }, [agentId]);

  useEffect(() => {
    if (currentAgent) {
      setFormData({
        agent_name: currentAgent.agent_name,
        description: currentAgent.description || "",
        prompt_base: currentAgent.prompt_base,
        additional_instructions: currentAgent.additional_instructions || "",
        client_id: currentAgent.client_id || "none",
        is_collaborator: (currentAgent as any).is_collaborator || false,
      });
    }
  }, [currentAgent]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (formData.prompt_base.length < 50) {
      setShowWarning(true);
      setActiveSection("prompt");
      return;
    }

    setSaving(true);
    try {
      const { is_collaborator, ...rest } = formData;
      await updateAgent(agentId, {
        ...rest,
        client_id: rest.client_id === "none" ? null : rest.client_id,
        is_collaborator,
      } as any);
      
      await syncCollaboratorStatus(agentId, is_collaborator, formData.agent_name);
      
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!currentConversation && agentId) {
      await createConversation(agentId);
    }
    await sendMessage(message);
  };

  const handleNewConversation = async () => {
    if (agentId) {
      await createConversation(agentId);
    }
  };

  const visibleMenuItems = showChat ? menuItems : menuItems.filter((m) => m.id !== "chat");

  if (!currentAgent) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Carregando agente...</p>
      </div>
    );
  }

  const isChat = activeSection === "chat";

  return (
    <div className="flex gap-6 min-h-[600px] h-full">
      {/* Sidebar Card — same pattern as SettingsLayout */}
      <Card className="w-80 p-6 shrink-0">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{currentAgent.agent_name}</h2>
            <p className="text-sm text-muted-foreground">
              Configurações do agente
            </p>
          </div>

          <Separator />

          <nav className="space-y-1">
            {visibleMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-colors w-full text-left",
                  activeSection === item.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{item.label}</div>
                </div>
              </button>
            ))}
          </nav>

          {!isChat && (
            <>
              <Separator />
              <Button onClick={() => handleSubmit()} disabled={saving} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isChat ? (
          <Card className="flex h-full overflow-hidden">
            <AgentConversationsSidebar
              conversations={conversations}
              currentConversation={currentConversation}
              onConversationSelect={loadConversation}
              onConversationDelete={deleteConversation}
              onConversationRename={renameConversation}
              onNewConversation={handleNewConversation}
            />
            <div className="flex-1 flex flex-col">
              {currentConversation ? (
                <>
                  <div className="flex-1 overflow-hidden">
                    <ChatMessages messages={messages} loading={loading} />
                  </div>
                  <div className="border-t border-border p-4">
                    <ChatInput onSendMessage={handleSendMessage} disabled={loading} />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div>
                    <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhuma conversa selecionada</h3>
                    <p className="text-muted-foreground mb-4">
                      Crie uma nova conversa para começar a interagir com {currentAgent.agent_name}
                    </p>
                    <Button onClick={handleNewConversation}>Nova Conversa</Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card className="p-6 overflow-y-auto max-h-[calc(100vh-220px)]">
            {activeSection === "geral" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold mb-4">Configurações Gerais</h2>
                <div>
                  <Label htmlFor="agent_name">Nome do Agente *</Label>
                  <Input
                    id="agent_name"
                    value={formData.agent_name}
                    onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
                    placeholder="Ex: Assistente de Marketing"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição Resumida</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Breve descrição do agente (opcional)"
                  />
                </div>
                <div>
                  <Label htmlFor="client_id">Cliente Associado (Opcional)</Label>
                  <SearchableClientSelect
                    clients={clients.map(c => ({ id: c.id, name: c.name }))}
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                    noneLabel="Nenhum cliente específico"
                    placeholder="Selecione um cliente"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Quando associado, o agente terá acesso automático ao briefing, campanhas e métricas deste cliente.
                  </p>
                </div>
                
                {/* Collaborator Toggle */}
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-primary" />
                      <Label htmlFor="is_collaborator" className="font-medium">Ativar como Colaborador</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Quando ativado, este agente aparecerá como colaborador da empresa — podendo ser atribuído a tarefas, 
                      adicionado a squads e contactado no chat interno.
                    </p>
                  </div>
                  <Switch
                    id="is_collaborator"
                    checked={formData.is_collaborator}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_collaborator: checked })}
                  />
                </div>
              </div>
            )}

            {activeSection === "prompt" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold mb-4">Prompt & Instruções</h2>
                <div>
                  <Label htmlFor="prompt_base">Prompt Base do Agente *</Label>
                  <Textarea
                    id="prompt_base"
                    ref={promptRef}
                    value={formData.prompt_base}
                    onChange={(e) => {
                      setFormData({ ...formData, prompt_base: e.target.value });
                      if (e.target.value.length >= 50) setShowWarning(false);
                    }}
                    placeholder="Descreva como o agente deve se comportar, seu tom de voz, especialidades..."
                    className="min-h-[250px]"
                    required
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {formData.prompt_base.length}/50 caracteres mínimos
                  </p>
                </div>
                <PromptSkillInjector agentId={agentId} onInsertSkill={handleInsertSkill} />
                <div>
                  <Label htmlFor="additional_instructions">Instruções Adicionais</Label>
                  <Textarea
                    id="additional_instructions"
                    value={formData.additional_instructions}
                    onChange={(e) =>
                      setFormData({ ...formData, additional_instructions: e.target.value })
                    }
                    placeholder="Contexto adicional, regras específicas... (opcional)"
                    className="min-h-[180px]"
                  />
                </div>
                {showWarning && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      O prompt deve ter no mínimo 50 caracteres. Seja mais específico sobre como o agente deve se comportar.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {activeSection === "conhecimento" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold mb-4">Base de Conhecimento</h2>
                <KnowledgeDocumentsManager agentId={agentId} />
              </div>
            )}

            {activeSection === "skills" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold mb-1">Skills do Agente</h2>
                <p className="text-sm text-muted-foreground">
                  Habilite as capacidades que este agente pode executar durante conversas.
                </p>
                <AgentSkillsConfig
                  agentId={agentId}
                  hasClient={formData.client_id !== "none"}
                />
              </div>
            )}

            {activeSection === "telegram" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold mb-4">Integração com Telegram</h2>
                <TelegramBotConfig
                  agentId={agentId}
                  telegramBotToken={(currentAgent as any).telegram_bot_token || null}
                  telegramBotName={(currentAgent as any).telegram_bot_name || null}
                  onUpdate={() => loadAgent(agentId)}
                />
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
