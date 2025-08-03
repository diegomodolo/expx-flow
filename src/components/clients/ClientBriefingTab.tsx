import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import { Client } from "@/hooks/useClients";

interface ClientBriefingTabProps {
  client: Client;
  onBriefingUpdate: (updatedClient: Client) => void;
}

export function ClientBriefingTab({ client, onBriefingUpdate }: ClientBriefingTabProps) {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generateBriefing = async () => {
    if (!client.website_url) {
      toast({
        title: "Website necessário",
        description: "É necessário preencher o campo Website na aba Informações Gerais para gerar o briefing.",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-client-briefing', {
        body: {
          clientId: client.id,
          websiteUrl: client.website_url,
        },
      });

      if (error) throw error;

      if (data.success) {
        // Update local client state
        const updatedClient = {
          ...client,
          ai_briefing: data.briefing,
          briefing_generated_at: new Date().toISOString(),
        };
        onBriefingUpdate(updatedClient);

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
          {client.briefing_generated_at && (
            <span className="text-xs text-muted-foreground">
              Atualizado em {formatDate(client.briefing_generated_at)}
            </span>
          )}
          
          <Button
            onClick={generateBriefing}
            disabled={generating || !client.website_url}
            className="flex items-center gap-2"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : client.ai_briefing ? (
              <RefreshCw className="w-4 h-4" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {generating ? "Gerando..." : client.ai_briefing ? "Atualizar Briefing" : "Gerar Briefing via IA"}
          </Button>
        </div>
      </div>

      {!client.website_url && (
        <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
          <p className="text-sm text-yellow-800">
            💡 <strong>Dica:</strong> Preencha o campo "Website" na aba "Informações Gerais" para gerar um briefing detalhado automaticamente.
          </p>
        </div>
      )}

      {client.ai_briefing ? (
        <div className="space-y-4">
          <div className="prose prose-sm max-w-none">
            <div 
              className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200"
              dangerouslySetInnerHTML={{ 
                __html: client.ai_briefing.replace(/\n/g, '<br>').replace(/#{1,6}\s/g, '<strong>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
              }}
            />
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-blue-600" />
          </div>
          <h4 className="text-lg font-medium mb-2">Nenhum briefing gerado ainda</h4>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Gere um briefing inteligente baseado na análise completa do website do cliente para criar campanhas mais eficazes.
          </p>
          {client.website_url && (
            <Button onClick={generateBriefing} disabled={generating}>
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar Briefing via IA
            </Button>
          )}
        </div>
      )}
    </div>
  );
}