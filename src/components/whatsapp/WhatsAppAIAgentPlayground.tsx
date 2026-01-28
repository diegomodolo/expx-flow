import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, Loader2, Sparkles, RefreshCw, User, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { WhatsAppAIAgentConfig, defaultConfig } from "@/hooks/useWhatsAppAIAgentConfig";
import ReactMarkdown from "react-markdown";

interface PlaygroundProps {
  config: Partial<WhatsAppAIAgentConfig>;
  companyId?: string;
}

export function WhatsAppAIAgentPlayground({ config, companyId }: PlaygroundProps) {
  const [customerMessage, setCustomerMessage] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildSystemPrompt = () => {
    const c = { ...defaultConfig, ...config };
    
    const formalityDesc = c.formality_level > 70 
      ? "Use linguagem formal, tratamento respeitoso (Senhor/Senhora), evite gírias." 
      : c.formality_level < 30 
        ? "Use linguagem casual e descontraída, pode usar 'você', gírias leves são ok."
        : "Use linguagem semiformal, profissional mas acessível.";

    const empathyDesc = c.empathy_level > 70
      ? "Seja muito empático, demonstre compreensão genuína, valide os sentimentos do cliente."
      : c.empathy_level < 30
        ? "Seja direto e objetivo, foque na solução sem rodeios."
        : "Equilibre objetividade com empatia moderada.";

    const enthusiasmDesc = c.enthusiasm_level > 70
      ? "Seja energético e entusiasmado, use expressões positivas."
      : c.enthusiasm_level < 30
        ? "Mantenha tom calmo e sereno, evite exageros."
        : "Use tom equilibrado, nem muito calmo nem muito animado.";

    const emojiRule = c.emoji_usage === "none"
      ? "NÃO use emojis."
      : c.emoji_usage === "intense"
        ? "Use emojis frequentemente para expressar emoções."
        : "Use emojis com moderação (máximo 1-2 por mensagem).";

    const lengthRule = c.response_length === "short"
      ? "Mantenha respostas curtas e diretas (máximo 2-3 frases)."
      : c.response_length === "long"
        ? "Forneça respostas detalhadas e completas."
        : "Use respostas de tamanho médio, equilibradas.";

    const formatRules = [];
    if (c.use_bold) formatRules.push("Use **negrito** para destacar palavras-chave importantes.");
    if (c.use_lists) formatRules.push("Use listas com bullets (•) para múltiplos itens ou passos.");
    if (c.use_short_paragraphs) formatRules.push("Quebre o texto em parágrafos curtos para melhor legibilidade.");

    const blacklistRule = c.blacklist_words.length > 0
      ? `NUNCA use estas palavras ou frases: ${c.blacklist_words.join(", ")}.`
      : "";

    const ctaRule = c.mandatory_cta
      ? `SEMPRE finalize com: ${c.mandatory_cta}`
      : "";

    const departmentMap: Record<string, string> = {
      atendimento_geral: "Atendimento ao Cliente",
      suporte_tecnico: "Suporte Técnico",
      vendas: "Vendas",
      pos_venda: "Pós-Venda",
      financeiro: "Financeiro",
    };

    const objectiveMap: Record<string, string> = {
      resolver_duvida: "resolver dúvidas e problemas do cliente",
      agendar_reuniao: "agendar reuniões ou compromissos",
      acalmar_cliente: "acalmar e tranquilizar clientes insatisfeitos",
      vender: "persuadir e fechar vendas",
      informar: "fornecer informações claras e precisas",
      qualificar_lead: "qualificar leads fazendo perguntas estratégicas",
    };

    return `Você é ${c.agent_name}, um assistente virtual do departamento de ${departmentMap[c.department] || c.department}.

Seu objetivo principal é: ${objectiveMap[c.primary_objective] || c.primary_objective}.

## Tom e Voz
${formalityDesc}
${empathyDesc}
${enthusiasmDesc}
${emojiRule}

## Formatação
${lengthRule}
${formatRules.join("\n")}

## Regras Importantes
${blacklistRule}
${ctaRule}

Responda a mensagem do cliente de forma natural, seguindo todas as diretrizes acima.`;
  };

  const testResponse = async () => {
    if (!customerMessage.trim()) return;

    setIsLoading(true);
    setError(null);
    setAiResponse("");

    try {
      const systemPrompt = buildSystemPrompt();

      const { data, error: fnError } = await supabase.functions.invoke("whatsapp-ai-assistant", {
        body: {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: customerMessage },
          ],
        },
      });

      if (fnError) throw fnError;

      if (data?.error) {
        throw new Error(data.error);
      }

      setAiResponse(data?.content || "Sem resposta");
    } catch (err) {
      console.error("[Playground] Error:", err);
      setError(err instanceof Error ? err.message : "Erro ao testar resposta");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center gap-2 pb-2 border-b">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Playground de Teste</h3>
      </div>

      <p className="text-xs text-muted-foreground">
        Simule uma mensagem de cliente para ver como o agente responderá com as configurações atuais
      </p>

      {/* Input do Cliente */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Mensagem do Cliente
        </Label>
        <Textarea
          value={customerMessage}
          onChange={(e) => setCustomerMessage(e.target.value)}
          placeholder="Digite uma mensagem de exemplo do cliente..."
          rows={3}
        />
      </div>

      <Button 
        onClick={testResponse} 
        disabled={isLoading || !customerMessage.trim()}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Gerando resposta...
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Testar Resposta
          </>
        )}
      </Button>

      {/* Preview da Resposta */}
      <div className="flex-1 min-h-0 overflow-auto">
        <Label className="flex items-center gap-2 mb-2">
          <Bot className="h-4 w-4" />
          Resposta do Agente
        </Label>
        
        <div className={cn(
          "rounded-lg border bg-muted/30 p-4 min-h-[120px]",
          !aiResponse && !error && "flex items-center justify-center"
        )}>
          {error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : aiResponse ? (
            <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{aiResponse}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center">
              A resposta do agente aparecerá aqui
            </div>
          )}
        </div>
      </div>

      {aiResponse && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setAiResponse("");
            setCustomerMessage("");
          }}
          className="w-full"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Limpar e Testar Novamente
        </Button>
      )}
    </div>
  );
}
