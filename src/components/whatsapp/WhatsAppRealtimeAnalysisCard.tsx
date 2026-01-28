import { cn } from "@/lib/utils";
import { Loader2, AlertTriangle, TrendingUp, TrendingDown, Minus, Bell, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RealtimeAnalysis } from "@/hooks/useWhatsAppRealtimeAnalysis";

interface WhatsAppRealtimeAnalysisCardProps {
  analysis: RealtimeAnalysis | null;
  isAnalyzing: boolean;
  error: string | null;
  onRefresh: () => void;
}

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
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onRefresh}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Tentar
        </Button>
      </div>
    );
  }

  if (isAnalyzing && !analysis) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Analisando...</span>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-sm text-muted-foreground">
        Aguardando mensagens...
      </div>
    );
  }

  const tempConfig = temperatureConfig[analysis.temperature];

  return (
    <div className="flex items-center justify-between gap-3">
      {/* Temperature */}
      <div className={cn("flex items-center gap-2 px-2.5 py-1 rounded-full border", tempConfig.bgClassName)}>
        <span className="text-sm">{tempConfig.emoji}</span>
        <span className={cn("text-xs font-medium", tempConfig.className)}>
          {tempConfig.label}
        </span>
      </div>

      {/* Alerts (if any) */}
      {analysis.alerts.length > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
          <Bell className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          <span className="text-xs text-amber-700 dark:text-amber-300">
            {analysis.alerts.length} {analysis.alerts.length === 1 ? "alerta" : "alertas"}
          </span>
        </div>
      )}

      {/* Refresh */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-6 w-6 ml-auto" 
        onClick={onRefresh}
        disabled={isAnalyzing}
      >
        <RefreshCw className={cn("h-3 w-3", isAnalyzing && "animate-spin")} />
      </Button>
    </div>
  );
}
