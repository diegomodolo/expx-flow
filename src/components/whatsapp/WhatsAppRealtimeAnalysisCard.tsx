import { cn } from "@/lib/utils";
import { Loader2, AlertTriangle, TrendingUp, TrendingDown, Minus, Lightbulb, MessageCircle, Target, Bell, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RealtimeAnalysis } from "@/hooks/useWhatsAppRealtimeAnalysis";

interface WhatsAppRealtimeAnalysisCardProps {
  analysis: RealtimeAnalysis | null;
  isAnalyzing: boolean;
  error: string | null;
  onRefresh: () => void;
}

const departmentLabels: Record<string, string> = {
  atendimento_geral: "Atendimento",
  suporte_tecnico: "Suporte",
  vendas: "Vendas",
  pos_venda: "Pós-Venda",
  financeiro: "Financeiro",
};

const temperatureConfig = {
  positive: {
    icon: TrendingUp,
    label: "Positiva",
    className: "text-green-600 dark:text-green-400",
    bgClassName: "bg-green-500/10 border-green-500/20",
    emoji: "🟢",
  },
  neutral: {
    icon: Minus,
    label: "Neutra",
    className: "text-yellow-600 dark:text-yellow-400",
    bgClassName: "bg-yellow-500/10 border-yellow-500/20",
    emoji: "🟡",
  },
  negative: {
    icon: TrendingDown,
    label: "Negativa",
    className: "text-red-600 dark:text-red-400",
    bgClassName: "bg-red-500/10 border-red-500/20",
    emoji: "🔴",
  },
};

export function WhatsAppRealtimeAnalysisCard({
  analysis,
  isAnalyzing,
  error,
  onRefresh,
}: WhatsAppRealtimeAnalysisCardProps) {
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
        <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" onClick={onRefresh}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (isAnalyzing && !analysis) {
    return (
      <div className="rounded-lg border bg-muted/50 p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div>
            <p className="text-sm font-medium">Analisando conversa...</p>
            <p className="text-xs text-muted-foreground">Aguarde enquanto processo o contexto</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Aguardando novas mensagens para análise
        </p>
      </div>
    );
  }

  const tempConfig = temperatureConfig[analysis.temperature];
  const TempIcon = tempConfig.icon;
  const departmentLabel = departmentLabels[analysis.departmentInsight.type] || analysis.departmentInsight.type;

  return (
    <div className="space-y-3">
      {/* Header with temperature and refresh */}
      <div className={cn("rounded-lg border p-3", tempConfig.bgClassName)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{tempConfig.emoji}</span>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Temperatura</p>
              <p className={cn("text-sm font-semibold", tempConfig.className)}>
                {tempConfig.label}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            onClick={onRefresh}
            disabled={isAnalyzing}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isAnalyzing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Interpretation */}
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-start gap-2">
          <MessageCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Interpretação</p>
            <p className="text-sm">{analysis.interpretation}</p>
          </div>
        </div>
      </div>

      {/* Suggestion */}
      <div className="rounded-lg border bg-primary/5 border-primary/20 p-3">
        <div className="flex items-start gap-2">
          <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Sugestão</p>
            <p className="text-sm">{analysis.suggestion}</p>
          </div>
        </div>
      </div>

      {/* Department Insight */}
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-start gap-2">
          <Target className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Insight ({departmentLabel})
            </p>
            <p className="text-sm mb-2">{analysis.departmentInsight.insight}</p>
            {analysis.departmentInsight.actionItems.length > 0 && (
              <ul className="space-y-1">
                {analysis.departmentInsight.actionItems.map((item, index) => (
                  <li key={index} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {analysis.alerts.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <div className="flex items-start gap-2">
            <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Alertas</p>
              <ul className="space-y-1">
                {analysis.alerts.map((alert, index) => (
                  <li key={index} className="text-sm text-amber-700 dark:text-amber-300">
                    {alert}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Timestamp */}
      <p className="text-xs text-muted-foreground text-center">
        Análise às {new Date(analysis.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
  );
}
