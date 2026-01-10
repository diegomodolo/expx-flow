import { useState } from "react";
import { ChevronDown, ChevronRight, TrendingUp, Package, Image, CheckCircle, XCircle, AlertCircle, SkipForward, Loader2, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RuleExecution, RuleEntityResult, MetricsData } from "./types";

interface RuleExecutionProgressProps {
  rules: RuleExecution[];
  currentRuleIndex: number;
}

function getActionLabel(actionType: string): string {
  const labels: Record<string, string> = {
    'pause': 'Pausar',
    'pause_campaign': 'Pausar Campanha',
    'pause_adset': 'Pausar Conjunto',
    'pause_ad': 'Pausar Criativo',
    'activate': 'Ativar',
    'activate_campaign': 'Ativar Campanha',
    'activate_adset': 'Ativar Conjunto',
    'activate_ad': 'Ativar Criativo',
    'increase_budget': 'Aumentar Budget',
    'decrease_budget': 'Reduzir Budget',
    'duplicate_campaign': 'Duplicar Campanha',
    'duplicate_adset': 'Duplicar Conjunto',
    'duplicate_ad': 'Duplicar Criativo',
  };
  return labels[actionType] || actionType;
}

function getEntityTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'campaign': 'Campanha',
    'adset': 'Conjunto',
    'ad': 'Criativo',
  };
  return labels[type] || type;
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'processing':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case 'actioned':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'skipped':
      return <SkipForward className="h-4 w-4 text-gray-400" />;
    case 'ignored':
      return <XCircle className="h-4 w-4 text-gray-300" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return null;
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'processing': 'Processando',
    'actioned': 'Ação Executada',
    'skipped': 'Condições não atendidas',
    'ignored': 'Objetivo diferente',
    'error': 'Erro',
  };
  return labels[status] || status;
}

function EntityResultItem({ result }: { result: RuleEntityResult }) {
  const getEntityIcon = () => {
    switch (result.entityType) {
      case 'campaign':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'adset':
        return <Package className="h-3 w-3 text-blue-500" />;
      case 'ad':
        return <Image className="h-3 w-3 text-purple-500" />;
    }
  };
  
  return (
    <div className={cn(
      "flex items-start gap-2 py-1.5 px-2 rounded text-sm",
      result.status === 'actioned' && "bg-green-50 dark:bg-green-950/30",
      result.status === 'ignored' && "bg-gray-50 dark:bg-gray-950/30 opacity-60",
      result.status === 'error' && "bg-red-50 dark:bg-red-950/30"
    )}>
      {getStatusIcon(result.status)}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {getEntityIcon()}
          <span className="font-medium truncate">{result.entityName}</span>
        </div>
        {result.parentCampaignName && result.entityType !== 'campaign' && (
          <div className="text-xs text-muted-foreground truncate">
            {result.parentCampaignName}
            {result.parentAdsetName && ` > ${result.parentAdsetName}`}
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          {result.reason || getStatusLabel(result.status)}
          {result.metrics && result.status !== 'ignored' && (
            <span className="ml-1">
              (CPA: R$ {result.metrics.cpa.toFixed(2)}, Conv: {result.metrics.conversions})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function RuleItem({ rule, isActive, index }: { rule: RuleExecution; isActive: boolean; index: number }) {
  const [expanded, setExpanded] = useState(isActive || rule.status === 'completed');
  
  const stats = {
    actioned: rule.results.filter(r => r.status === 'actioned').length,
    skipped: rule.results.filter(r => r.status === 'skipped').length,
    ignored: rule.results.filter(r => r.status === 'ignored').length,
    errors: rule.results.filter(r => r.status === 'error').length,
  };
  
  return (
    <div className={cn(
      "border rounded-lg overflow-hidden",
      isActive && "border-blue-500 ring-1 ring-blue-500"
    )}>
      <div 
        className={cn(
          "py-3 px-4 cursor-pointer transition-colors",
          isActive ? "bg-blue-50 dark:bg-blue-950/30" : "bg-muted/50 hover:bg-muted"
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {rule.status === 'pending' ? (
            <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
              <span className="text-xs text-muted-foreground">{index + 1}</span>
            </div>
          ) : rule.status === 'running' ? (
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
          
          {rule.results.length > 0 ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <div className="w-4" />
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">{rule.ruleName}</span>
              <Badge variant="outline" className="text-xs">
                {getEntityTypeLabel(rule.entityType)}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {getActionLabel(rule.actionType)}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Objetivos: {rule.campaignObjectives.length > 0 
                ? rule.campaignObjectives.join(', ') 
                : 'Todos'
              } | Janela: {rule.timeWindowDays} dias
            </div>
          </div>
          
          {rule.status === 'completed' && (
            <div className="flex items-center gap-2 text-xs">
              {stats.actioned > 0 && (
                <Badge className="bg-green-500">{stats.actioned} ações</Badge>
              )}
              {stats.skipped > 0 && (
                <Badge variant="secondary">{stats.skipped} ignorados</Badge>
              )}
              {stats.errors > 0 && (
                <Badge variant="destructive">{stats.errors} erros</Badge>
              )}
            </div>
          )}
        </div>
      </div>
      
      {expanded && rule.results.length > 0 && (
        <div className="max-h-[200px] overflow-y-auto p-2 space-y-1 bg-background">
          {rule.results.map((result, idx) => (
            <EntityResultItem key={`${result.entityId}-${idx}`} result={result} />
          ))}
        </div>
      )}
    </div>
  );
}

export function RuleExecutionProgress({ rules, currentRuleIndex }: RuleExecutionProgressProps) {
  if (!rules || rules.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhuma regra para executar</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Play className="h-4 w-4" />
        <span className="font-medium">📋 Aplicando Regras</span>
        <Badge variant="outline" className="ml-auto">
          {currentRuleIndex + 1} de {rules.length}
        </Badge>
      </div>
      
      <div className="space-y-2">
        {rules.map((rule, index) => (
          <RuleItem 
            key={rule.ruleId} 
            rule={rule} 
            isActive={index === currentRuleIndex && rule.status === 'running'}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
