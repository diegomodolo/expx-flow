import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Save, Loader2 } from "lucide-react";
import { useWhatsAppAIAgentConfig, defaultConfig, WhatsAppAIAgentConfig } from "@/hooks/useWhatsAppAIAgentConfig";
import { WhatsAppAIAgentIdentityPanel } from "./WhatsAppAIAgentIdentityPanel";
import { WhatsAppAIAgentKnowledgePanel } from "./WhatsAppAIAgentKnowledgePanel";
import { WhatsAppAIAgentFormatPanel } from "./WhatsAppAIAgentFormatPanel";
import { WhatsAppAIAgentPlayground } from "./WhatsAppAIAgentPlayground";
import { Separator } from "@/components/ui/separator";

interface AIAgentConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId?: string;
  instanceId?: string | null;
}

export function WhatsAppAIAgentConfigModal({ isOpen, onClose, companyId, instanceId }: AIAgentConfigModalProps) {
  const { config, isLoading, isSaving, saveConfig } = useWhatsAppAIAgentConfig(companyId, instanceId);
  
  // Local state for form
  const [formData, setFormData] = useState<Partial<WhatsAppAIAgentConfig>>({});

  // Initialize form data when config loads
  useEffect(() => {
    if (config) {
      setFormData(config);
    } else if (!isLoading) {
      setFormData(defaultConfig);
    }
  }, [config, isLoading]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    const success = await saveConfig(formData);
    if (success) {
      onClose();
    }
  };

  const currentConfig = {
    ...defaultConfig,
    ...formData,
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] max-h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>Configuração do Agente de IA</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure o comportamento do assistente de IA para suas conversas no WhatsApp
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex">
            {/* Coluna 1: Identidade e Tom */}
            <div className="w-1/3 border-r">
              <ScrollArea className="h-full">
                <div className="p-6">
                  <WhatsAppAIAgentIdentityPanel
                    config={{
                      agent_name: currentConfig.agent_name,
                      department: currentConfig.department,
                      primary_objective: currentConfig.primary_objective,
                      formality_level: currentConfig.formality_level,
                      empathy_level: currentConfig.empathy_level,
                      enthusiasm_level: currentConfig.enthusiasm_level,
                      emoji_usage: currentConfig.emoji_usage,
                    }}
                    onChange={handleChange}
                  />
                </div>
              </ScrollArea>
            </div>

            {/* Coluna 2: Conhecimento, Regras e Formatação */}
            <div className="w-1/3 border-r">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-6">
                  <WhatsAppAIAgentKnowledgePanel
                    config={{
                      use_purchase_history: currentConfig.use_purchase_history,
                      use_client_name: currentConfig.use_client_name,
                      use_satisfaction_score: currentConfig.use_satisfaction_score,
                      use_conversation_history: currentConfig.use_conversation_history,
                      blacklist_words: currentConfig.blacklist_words,
                      min_confidence_threshold: currentConfig.min_confidence_threshold,
                      escalation_message: currentConfig.escalation_message,
                      force_realtime_analysis: currentConfig.force_realtime_analysis,
                    }}
                    onChange={handleChange}
                  />

                  <Separator />

                  <WhatsAppAIAgentFormatPanel
                    config={{
                      response_length: currentConfig.response_length,
                      use_bold: currentConfig.use_bold,
                      use_lists: currentConfig.use_lists,
                      use_short_paragraphs: currentConfig.use_short_paragraphs,
                      mandatory_cta: currentConfig.mandatory_cta,
                    }}
                    onChange={handleChange}
                  />
                </div>
              </ScrollArea>
            </div>

            {/* Coluna 3: Playground */}
            <div className="w-1/3">
              <div className="h-full p-6">
                <WhatsAppAIAgentPlayground config={currentConfig} companyId={companyId} />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
