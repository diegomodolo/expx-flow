import { cn } from "@/lib/utils";
import { Loader2, AlertTriangle, TrendingUp, TrendingDown, Minus, Bell, RefreshCw, Star, Send, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RealtimeAnalysis } from "@/hooks/useWhatsAppRealtimeAnalysis";

interface WhatsAppRealtimeAnalysisCardProps {
  analysis: RealtimeAnalysis | null;
  isAnalyzing: boolean;
  error: string | null;
  onRefresh: () => void;
  onSendReadyMessage?: (message: string) => void;
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

function getScoreColor(score: number): string {
  if (score >= 8) return "text-green-600 dark:text-green-400";
  if (score >= 5) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBgColor(score: number): string {
  if (score >= 8) return "bg-green-500/10 border-green-500/20";
  if (score >= 5) return "bg-yellow-500/10 border-yellow-500/20";
  return "bg-red-500/10 border-red-500/20";
}

export function WhatsAppRealtimeAnalysisCard({
  analysis,
  isAnalyzing,
  error,
  onRefresh,
  onSendReadyMessage,
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
  const score = analysis.score ?? 0;

  return (
    <div className="space-y-2">
      {/* Top row: Temperature, Score, Refresh */}
      <div className="flex items-center gap-2">
        {/* Temperature */}
        <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full border", tempConfig.bgClassName)}>
          <span className="text-sm">{tempConfig.emoji}</span>
          <span className={cn("text-xs font-medium", tempConfig.className)}>
            {tempConfig.label}
          </span>
        </div>

        {/* Score */}
        <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full border", getScoreBgColor(score))}>
          <Star className={cn("h-3 w-3", getScoreColor(score))} />
          <span className={cn("text-xs font-bold", getScoreColor(score))}>
            {score.toFixed(1)}
          </span>
          <span className="text-[10px] text-muted-foreground">/10</span>
        </div>

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

      {/* Alerts (if any) - shown as list */}
      {analysis.alerts.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <div className="flex items-start gap-2">
            <Bell className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              {analysis.alerts.map((alert, index) => (
                <p key={index} className="text-xs text-amber-700 dark:text-amber-300">
                  {alert}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Ready Message Card */}
      {analysis.readyMessage && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
          <div className="flex items-start gap-2">
            <MessageSquareText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                Mensagem Pronta
              </p>
              <p className="text-xs text-emerald-800 dark:text-emerald-200 whitespace-pre-wrap break-words">
                {analysis.readyMessage}
              </p>
              {onSendReadyMessage && (
                <Button
                  size="sm"
                  className="h-7 mt-2 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => onSendReadyMessage(analysis.readyMessage)}
                >
                  <Send className="h-3 w-3" />
                  Revisar e Enviar
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
