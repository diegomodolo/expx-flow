import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles, RefreshCw, Save, Edit, PenLine } from "lucide-react";
import { Client } from "@/hooks/useClients";

interface ClientBriefingTabProps {
  client?: Client;
  formData: {
    website_url: string;
    [key: string]: any;
  };
  onBriefingUpdate: (updatedClient: Client) => void;
}

export function ClientBriefingTab({ client, formData, onBriefingUpdate }: ClientBriefingTabProps) {
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [briefingContent, setBriefingContent] = useState(client?.ai_briefing || "");
  const { toast } = useToast();

  // Sincronizar o briefingContent quando o cliente mudar
  useEffect(() => {
    setBriefingContent(client?.ai_briefing || "");
  }, [client?.ai_briefing]);

  const generateBriefing = async () => {
    const websiteUrl = formData.website_url;
    
    if (!websiteUrl) {
      toast({
        title: "Website necessário",
        description: "É necessário preencher o campo Website na aba Informações Gerais para gerar o briefing.",
        variant: "destructive",
      });
      return;
    }

    if (!client?.id) {
      toast({
        title: "Cliente não salvo",
        description: "É necessário salvar o cliente primeiro antes de gerar o briefing.",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-client-briefing', {
        body: {
          clientId: client.id,
          websiteUrl: websiteUrl,
        },
      });

      if (error) throw error;

      if (data.success) {
        // Update local client state and briefing content
        const updatedClient = {
          ...client,
          website_url: websiteUrl,
          ai_briefing: data.briefing,
          briefing_generated_at: new Date().toISOString(),
        };
        onBriefingUpdate(updatedClient);
        setBriefingContent(data.briefing);

        toast({
          title: "Briefing gerado com sucesso!",
          description: "O briefing foi analisado e salvo automaticamente.",
        });
      } else {
        throw new Error(data.error || "Erro ao gerar briefing");
      }
    } catch (error) {
      console.error("Erro ao gerar briefing:", error);
      toast({
        title: "Erro ao gerar briefing",
        description: error instanceof Error ? error.message : "Erro interno. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const saveBriefing = async () => {
    if (!client?.id) {
      toast({
        title: "Cliente não encontrado",
        description: "Não foi possível salvar o briefing.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          ai_briefing: briefingContent,
          briefing_generated_at: new Date().toISOString(),
        })
        .eq('id', client.id);

      if (error) throw error;

      // Update local client state
      const updatedClient = {
        ...client,
        ai_briefing: briefingContent,
        briefing_generated_at: new Date().toISOString(),
      };
      onBriefingUpdate(updatedClient);
      setIsEditing(false);

      toast({
        title: "Briefing salvo!",
        description: "As alterações foram salvas com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao salvar briefing:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    setBriefingContent(client?.ai_briefing || "");
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setBriefingContent(client?.ai_briefing || "");
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Briefing Inteligente</h3>
          <p className="text-sm text-muted-foreground">
            Análise completa do negócio baseada no website para criação de campanhas eficazes
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {client?.briefing_generated_at && (
            <span className="text-xs text-muted-foreground">
              Atualizado em {formatDate(client.briefing_generated_at)}
            </span>
          )}
          
          <Button
            type="button"
            onClick={generateBriefing}
            disabled={generating || !formData.website_url || !client?.id}
            className="flex items-center gap-2"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : client?.ai_briefing ? (
              <RefreshCw className="w-4 h-4" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {generating ? "Gerando..." : client?.ai_briefing ? "Atualizar Briefing" : "Gerar Briefing via IA"}
          </Button>
        </div>
      </div>

      {!formData.website_url && (
        <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
          <p className="text-sm text-yellow-800">
            💡 <strong>Dica:</strong> Preencha o campo "Website" na aba "Informações Gerais" para gerar um briefing detalhado automaticamente.
          </p>
        </div>
      )}

      {!client?.id && formData.website_url && (
        <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            ℹ️ <strong>Aviso:</strong> Salve o cliente primeiro clicando em "Criar" na aba "Informações Gerais" para poder gerar o briefing.
          </p>
        </div>
      )}

      {client?.ai_briefing ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-medium">Briefing do Cliente</h4>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={saveBriefing}
                    disabled={saving}
                    className="flex items-center gap-2"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </Button>
              )}
            </div>
          </div>
          
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={briefingContent}
                onChange={(e) => setBriefingContent(e.target.value)}
                placeholder="Digite ou edite o briefing do cliente..."
                className="min-h-[400px] p-4 font-mono text-sm"
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                💡 Dica: Use formatação Markdown para melhor organização do conteúdo.
              </p>
            </div>
          ) : (
            <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {client.ai_briefing}
              </div>
            </div>
          )}
        </div>
      ) : isEditing ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-medium">Briefing do Cliente</h4>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cancelEdit}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={saveBriefing}
                disabled={saving || !briefingContent.trim()}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
          <Textarea
            value={briefingContent}
            onChange={(e) => setBriefingContent(e.target.value)}
            placeholder="Digite o briefing do cliente..."
            className="min-h-[400px] p-4 font-mono text-sm"
            disabled={saving}
          />
          <p className="text-xs text-muted-foreground">
            💡 Dica: Use formatação Markdown para melhor organização do conteúdo.
          </p>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-blue-600" />
          </div>
          <h4 className="text-lg font-medium mb-2">Nenhum briefing ainda</h4>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Gere um briefing inteligente via IA ou escreva manualmente as informações do cliente.
          </p>
          <div className="flex items-center justify-center gap-3">
            {formData.website_url && client?.id && (
              <Button type="button" onClick={generateBriefing} disabled={generating}>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar via IA
              </Button>
            )}
            {client?.id && (
              <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
                <PenLine className="w-4 h-4 mr-2" />
                Escrever Manualmente
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}