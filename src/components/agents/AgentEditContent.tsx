import React, { useEffect, useState } from "react";
import { Settings, Brain, FileText, Bot, Puzzle, MessageCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useIAAgents } from "@/hooks/useIAAgents";
import { useClients } from "@/hooks/useClients";
import { KnowledgeDocumentsManager } from "@/components/agents/KnowledgeDocumentsManager";
import { TelegramBotConfig } from "@/components/agents/TelegramBotConfig";
import { AgentSkillsConfig } from "@/components/agents/AgentSkillsConfig";
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
  /** Initial section to show */
  defaultSection?: Section;
  /** Whether to show the chat section */
  showChat?: boolean;
  /** Called after agent is saved */
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
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>(defaultSection);
  const [formData, setFormData] = useState({
    agent_name: "",
    description: "",
    prompt_base: "",
    additional_instructions: "",
    client_id: "none",
  });
  const [showWarning, setShowWarning] = useState(false);

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
      await updateAgent(agentId, {
        ...formData,
        client_id: formData.client_id === "none" ? null : formData.client_id,
      });
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold truncate">{currentAgent.agent_name}</h2>
        {!isChat && (
          <Button onClick={() => handleSubmit()} disabled={saving} size="sm">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        )}
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-48 border-r bg-muted/30 p-2 space-y-1 shrink-0 overflow-y-auto">
          {visibleMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                activeSection === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        {isChat ? (
          <div className="flex-1 flex overflow-hidden">
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
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl">
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
                    <Select
                      value={formData.client_id}
                      onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum cliente específico</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-1">
                      Quando associado, o agente terá acesso automático ao briefing, campanhas e métricas deste cliente.
                    </p>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
