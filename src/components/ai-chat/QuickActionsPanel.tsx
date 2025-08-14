import React from "react";
import { ActionCategory } from "./ActionCategory";
import { QuickActionButton } from "./QuickActionButton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  BarChart3, 
  Lightbulb, 
  FileText, 
  Target, 
  Users,
  TrendingUp,
  Search,
  DollarSign,
  Calendar,
  Sparkles,
  Edit3,
  MessageSquare,
  Megaphone,
  Share2,
  PieChart,
  Activity,
  Globe,
  Building,
  History
} from "lucide-react";

interface QuickActionsPanelProps {
  onSendMessage: (message: string) => void;
  selectedClientId: string;
  disabled?: boolean;
}

export function QuickActionsPanel({ 
  onSendMessage, 
  selectedClientId, 
  disabled = false 
}: QuickActionsPanelProps) {
  const handleQuickAction = (prompt: string) => {
    if (!disabled && selectedClientId) {
      onSendMessage(prompt);
    }
  };

  const isDisabled = disabled || !selectedClientId;

  return (
    <div className="w-80 border-l border-border bg-card">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm text-foreground">Ações Rápidas</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Envie comandos pré-definidos para a IA
        </p>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="p-4 space-y-1">
          
          <ActionCategory 
            title="Análise & Otimização" 
            icon={<BarChart3 className="h-4 w-4" />}
            variant="analysis"
            defaultOpen={true}
          >
            <QuickActionButton
              title="Analisar Performance"
              description="Análise detalhada das campanhas ativas do cliente"
              icon={TrendingUp}
              onClick={() => handleQuickAction("Faça uma análise detalhada da performance das campanhas ativas deste cliente, destacando principais métricas, tendências e pontos de atenção.")}
              disabled={isDisabled}
              variant="analysis"
            />
            <QuickActionButton
              title="Identificar Oportunidades"
              description="Encontrar oportunidades de otimização e melhoria"
              icon={Search}
              onClick={() => handleQuickAction("Identifique oportunidades de otimização nas campanhas atuais, considerando métricas de performance, segmentação e budget distribution.")}
              disabled={isDisabled}
              variant="analysis"
            />
            <QuickActionButton
              title="Revisar CPA e ROAS"
              description="Análise específica de eficiência de investimento"
              icon={DollarSign}
              onClick={() => handleQuickAction("Faça uma revisão detalhada do CPA e ROAS das campanhas, identificando quais estão performando bem e quais precisam de ajustes.")}
              disabled={isDisabled}
              variant="analysis"
            />
          </ActionCategory>

          <ActionCategory 
            title="Geração de Conteúdo" 
            icon={<Sparkles className="h-4 w-4" />}
            variant="content"
          >
            <QuickActionButton
              title="Gerar Ideias de Criativos"
              description="Sugestões criativas para campanhas"
              icon={Lightbulb}
              onClick={() => handleQuickAction("Gere 5 ideias criativas inovadoras para campanhas deste cliente, considerando o perfil da marca e público-alvo.")}
              disabled={isDisabled}
              variant="content"
            />
            <QuickActionButton
              title="Criar Copy para Anúncios"
              description="Textos persuasivos para diferentes formatos"
              icon={Edit3}
              onClick={() => handleQuickAction("Crie copies persuasivos para anúncios deste cliente, incluindo headlines, descrições e call-to-actions otimizados.")}
              disabled={isDisabled}
              variant="content"
            />
            <QuickActionButton
              title="Call-to-Actions Eficazes"
              description="CTAs otimizados para conversão"
              icon={MessageSquare}
              onClick={() => handleQuickAction("Sugira 10 call-to-actions eficazes e personalizados para as campanhas deste cliente, focando em maximizar conversões.")}
              disabled={isDisabled}
              variant="content"
            />
          </ActionCategory>

          <ActionCategory 
            title="Relatórios Rápidos" 
            icon={<FileText className="h-4 w-4" />}
            variant="report"
          >
            <QuickActionButton
              title="Resumo Executivo"
              description="Visão geral para apresentação"
              icon={PieChart}
              onClick={() => handleQuickAction("Prepare um resumo executivo completo da conta deste cliente, incluindo principais resultados, insights e próximos passos recomendados.")}
              disabled={isDisabled}
              variant="report"
            />
            <QuickActionButton
              title="Comparativo Mensal"
              description="Análise de evolução temporal"
              icon={Calendar}
              onClick={() => handleQuickAction("Gere um relatório comparativo da performance mensal deste cliente, destacando tendências, sazonalidades e evolução dos principais KPIs.")}
              disabled={isDisabled}
              variant="report"
            />
            <QuickActionButton
              title="Análise de Funil"
              description="Performance por etapa do funil"
              icon={Activity}
              onClick={() => handleQuickAction("Analise o funil de conversão deste cliente, identificando gargalos, oportunidades de otimização e sugestões de melhoria por etapa.")}
              disabled={isDisabled}
              variant="report"
            />
          </ActionCategory>

          <ActionCategory 
            title="Estratégia" 
            icon={<Target className="h-4 w-4" />}
            variant="strategy"
          >
            <QuickActionButton
              title="Próximos Passos"
              description="Plano estratégico de curto prazo"
              icon={Target}
              onClick={() => handleQuickAction("Defina os próximos passos estratégicos para este cliente, considerando performance atual, objetivos e oportunidades de mercado.")}
              disabled={isDisabled}
              variant="strategy"
            />
            <QuickActionButton
              title="Análise Competitiva"
              description="Posicionamento no mercado"
              icon={Globe}
              onClick={() => handleQuickAction("Faça uma análise competitiva para este cliente, comparando estratégias, posicionamento e oportunidades de diferenciação no mercado.")}
              disabled={isDisabled}
              variant="strategy"
            />
            <QuickActionButton
              title="Segmentação Avançada"
              description="Otimização de audiências"
              icon={Users}
              onClick={() => handleQuickAction("Sugira estratégias avançadas de segmentação para este cliente, incluindo novos públicos, lookalikes e exclusões otimizadas.")}
              disabled={isDisabled}
              variant="strategy"
            />
          </ActionCategory>

          <Separator className="my-4" />

          <ActionCategory 
            title="Ações Contextuais" 
            icon={<Building className="h-4 w-4" />}
            variant="contextual"
          >
            <QuickActionButton
              title="Revisar Briefing"
              description="Análise do briefing do cliente"
              icon={FileText}
              onClick={() => handleQuickAction("Revise e analise o briefing completo deste cliente, destacando pontos importantes, objetivos e oportunidades identificadas.")}
              disabled={isDisabled}
              variant="contextual"
            />
            <QuickActionButton
              title="Histórico de Conversas"
              description="Resumo das interações anteriores"
              icon={History}
              onClick={() => handleQuickAction("Faça um resumo das principais discussões e decisões tomadas nas conversas anteriores com este cliente.")}
              disabled={isDisabled}
              variant="contextual"
            />
            <QuickActionButton
              title="Campanhas de Sucesso"
              description="Benchmarks e inspirações"
              icon={Megaphone}
              onClick={() => handleQuickAction("Analise campanhas similares de sucesso no setor deste cliente e sugira adaptações que poderiam funcionar bem.")}
              disabled={isDisabled}
              variant="contextual"
            />
          </ActionCategory>

        </div>
      </ScrollArea>
    </div>
  );
}