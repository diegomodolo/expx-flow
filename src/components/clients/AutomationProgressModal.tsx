import { useEffect, useState, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, CheckCircle, XCircle, AlertCircle, 
  AlertTriangle, Database, Play, BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AutomationHierarchyTree } from "./automation/AutomationHierarchyTree";
import { RuleExecutionProgress } from "./automation/RuleExecutionProgress";
import { 
  CampaignHierarchy, 
  RuleExecution, 
  ProgressUpdate,
  ExecutionPhase 
} from "./automation/types";

interface AutomationProgressModalProps {
  open: boolean;
  executionId: string;
  clientId: string;
  onClose: () => void;
  onComplete?: () => void;
}

export function AutomationProgressModal({
  open,
  executionId,
  clientId,
  onClose,
  onComplete
}: AutomationProgressModalProps) {
  const [updates, setUpdates] = useState<ProgressUpdate[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [activeTab, setActiveTab] = useState("progress");
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const timeoutCheckRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open || !executionId) return;

    // Reset state
    setUpdates([]);
    setIsComplete(false);
    setIsTimedOut(false);
    setActiveTab("progress");
    lastUpdateTimeRef.current = Date.now();

    // Buscar updates existentes
    const fetchExistingUpdates = async () => {
      const { data } = await supabase
        .from('automation_execution_progress')
        .select('*')
        .eq('execution_id', executionId)
        .order('created_at', { ascending: true });

      if (data) {
        setUpdates(data as ProgressUpdate[]);
        lastUpdateTimeRef.current = Date.now();
        
        // Check if already complete
        const hasCompletion = data.some(u => u.rule_name === 'Conclusão');
        if (hasCompletion) {
          setIsComplete(true);
        }
      }
    };
    fetchExistingUpdates();

    // Subscribe para novos updates
    const subscription = supabase
      .channel(`automation-progress-${executionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'automation_execution_progress',
        filter: `execution_id=eq.${executionId}`
      }, payload => {
        const newUpdate = payload.new as ProgressUpdate;
        console.log('📥 Realtime update received:', newUpdate);
        setUpdates(prev => [...prev, newUpdate]);
        lastUpdateTimeRef.current = Date.now();
        
        if (newUpdate.rule_name === 'Conclusão') {
          setIsComplete(true);
          onComplete?.();
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'automation_execution_progress',
        filter: `execution_id=eq.${executionId}`
      }, payload => {
        const updatedRecord = payload.new as ProgressUpdate;
        setUpdates(prev => prev.map(u => 
          u.id === updatedRecord.id ? updatedRecord : u
        ));
        lastUpdateTimeRef.current = Date.now();
      })
      .subscribe();

    // Timeout detection - 5 minutos sem updates (300 segundos)
    // Aumentado porque execuções com muitas campanhas podem demorar
    timeoutCheckRef.current = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastUpdateTimeRef.current;
      if (timeSinceLastUpdate > 300000 && !isComplete) {
        setIsTimedOut(true);
      }
    }, 10000);

    return () => {
      subscription.unsubscribe();
      if (timeoutCheckRef.current) {
        clearInterval(timeoutCheckRef.current);
      }
    };
  }, [open, executionId]);

  // Determinar fase atual baseado nos updates
  const currentPhase = useMemo((): ExecutionPhase => {
    if (isComplete) {
      return { phase: 'completed', message: 'Execução concluída', progress: 100 };
    }
    if (isTimedOut) {
      return { phase: 'error', message: 'Timeout na execução', progress: 100 };
    }
    
    const phaseUpdates = updates.filter(u => 
      u.metadata?.phase || u.rule_name === 'Fase'
    );
    
    // Verificar se ainda está coletando estrutura
    const hasHierarchy = updates.some(u => u.rule_name === 'Estrutura Completa');
    const hasMetrics = updates.some(u => u.rule_name === 'Métricas Carregadas');
    
    if (!hasHierarchy) {
      const collectingUpdates = updates.filter(u => 
        u.rule_name === 'Coleta' || u.message?.includes('Buscando') || u.message?.includes('Encontrad')
      );
      return { 
        phase: 'collecting', 
        message: collectingUpdates.length > 0 
          ? collectingUpdates[collectingUpdates.length - 1].message 
          : 'Buscando estrutura no Facebook...', 
        progress: 15 
      };
    }
    
    if (!hasMetrics) {
      return { phase: 'metrics', message: 'Carregando métricas...', progress: 40 };
    }
    
    return { phase: 'applying', message: 'Aplicando regras...', progress: 70 };
  }, [updates, isComplete, isTimedOut]);

  // Extrair hierarquia dos updates
  const hierarchy = useMemo((): CampaignHierarchy[] => {
    const hierarchyUpdate = updates.find(u => u.rule_name === 'Estrutura Completa');
    if (hierarchyUpdate?.metadata?.hierarchy) {
      return hierarchyUpdate.metadata.hierarchy;
    }
    return [];
  }, [updates]);

  // Construir progresso das regras baseado nos updates
  const ruleExecutions = useMemo((): RuleExecution[] => {
    const rulesMap = new Map<string, RuleExecution>();
    
    // Processar updates para construir estrutura de regras
    updates.forEach(update => {
      // Ignorar logs de sistema
      if (['Coleta', 'Consulta', 'Análise', 'Validação', 'Conclusão', 'Fase', 
           'Estrutura Completa', 'Métricas Carregadas', 'Sistema'].includes(update.rule_name)) {
        return;
      }
      
      const ruleKey = update.rule_name;
      
      if (!rulesMap.has(ruleKey)) {
        rulesMap.set(ruleKey, {
          ruleId: ruleKey,
          ruleName: update.rule_name,
          entityType: update.entity_type as 'campaign' | 'adset' | 'ad',
          actionType: 'unknown',
          campaignObjectives: [],
          timeWindowDays: 7,
          status: 'running',
          results: []
        });
      }
      
      const rule = rulesMap.get(ruleKey)!;
      
      // Mapear status do update para status do resultado
      let resultStatus: 'ignored' | 'skipped' | 'actioned' | 'error' | 'processing' = 'processing';
      if (update.status === 'actioned') resultStatus = 'actioned';
      else if (update.status === 'skipped') {
        resultStatus = update.message?.includes('objetivo') ? 'ignored' : 'skipped';
      }
      else if (update.status === 'error') resultStatus = 'error';
      
      // Adicionar resultado
      rule.results.push({
        entityId: update.id,
        entityName: update.entity_name,
        entityType: update.entity_type as 'campaign' | 'adset' | 'ad',
        parentCampaignName: update.metadata?.parent_campaign,
        parentAdsetName: update.metadata?.parent_adset,
        status: resultStatus,
        reason: update.message,
        metrics: update.metadata?.metrics
      });
    });
    
    // Marcar regras como concluídas se não há mais processando
    rulesMap.forEach(rule => {
      const hasProcessing = rule.results.some(r => r.status === 'processing');
      if (!hasProcessing && rule.results.length > 0) {
        rule.status = 'completed';
      }
    });
    
    return Array.from(rulesMap.values());
  }, [updates]);

  // Calcular estatísticas gerais
  const stats = useMemo(() => {
    const allResults = ruleExecutions.flatMap(r => r.results);
    return {
      total: allResults.length,
      actioned: allResults.filter(r => r.status === 'actioned').length,
      skipped: allResults.filter(r => r.status === 'skipped').length,
      ignored: allResults.filter(r => r.status === 'ignored').length,
      errors: allResults.filter(r => r.status === 'error').length,
    };
  }, [ruleExecutions]);

  const completionUpdate = updates.find(u => u.rule_name === 'Conclusão');
  const currentRuleIndex = ruleExecutions.findIndex(r => r.status === 'running');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isComplete ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : isTimedOut ? (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
            {isComplete ? "Execução Concluída" : isTimedOut ? "Execução Finalizada" : "Executando Automações..."}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{currentPhase.message}</span>
              <span className="font-medium">{Math.round(currentPhase.progress)}%</span>
            </div>
            <Progress value={currentPhase.progress} className="h-2" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-3">
            <div className="text-center p-2 bg-muted rounded-lg">
              <div className="text-xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <div className="text-xl font-bold text-green-600">{stats.actioned}</div>
              <div className="text-xs text-muted-foreground">Ações</div>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-950/30 rounded-lg">
              <div className="text-xl font-bold text-gray-600">{stats.skipped}</div>
              <div className="text-xs text-muted-foreground">Ignorados</div>
            </div>
            <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
              <div className="text-xl font-bold text-yellow-600">{stats.ignored}</div>
              <div className="text-xs text-muted-foreground">Objetivo ≠</div>
            </div>
            <div className="text-center p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
              <div className="text-xl font-bold text-red-600">{stats.errors}</div>
              <div className="text-xs text-muted-foreground">Erros</div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="progress" className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Progresso
              </TabsTrigger>
              <TabsTrigger value="hierarchy" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Estrutura
              </TabsTrigger>
              <TabsTrigger value="rules" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Regras
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="progress" className="mt-4">
              <ScrollArea className="h-[350px] pr-4">
                {ruleExecutions.length === 0 && !isComplete && !isTimedOut ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>{currentPhase.message}</p>
                  </div>
                ) : (
                  <RuleExecutionProgress 
                    rules={ruleExecutions} 
                    currentRuleIndex={currentRuleIndex >= 0 ? currentRuleIndex : ruleExecutions.length - 1}
                  />
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="hierarchy" className="mt-4">
              <ScrollArea className="h-[350px] pr-4">
                <AutomationHierarchyTree 
                  hierarchy={hierarchy}
                  isLoading={currentPhase.phase === 'collecting'}
                  loadingMessage={currentPhase.message}
                />
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="rules" className="mt-4">
              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-3">
                  {ruleExecutions.map((rule, idx) => (
                    <div key={rule.ruleId} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {rule.status === 'completed' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : rule.status === 'running' ? (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border" />
                          )}
                          <span className="font-medium">{rule.ruleName}</span>
                        </div>
                        <Badge variant="outline">{rule.entityType}</Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="text-center p-1 bg-green-50 dark:bg-green-950/30 rounded">
                          <span className="font-bold text-green-600">
                            {rule.results.filter(r => r.status === 'actioned').length}
                          </span>
                          <span className="text-muted-foreground ml-1">ações</span>
                        </div>
                        <div className="text-center p-1 bg-gray-50 dark:bg-gray-950/30 rounded">
                          <span className="font-bold text-gray-600">
                            {rule.results.filter(r => r.status === 'skipped').length}
                          </span>
                          <span className="text-muted-foreground ml-1">ignorados</span>
                        </div>
                        <div className="text-center p-1 bg-yellow-50 dark:bg-yellow-950/30 rounded">
                          <span className="font-bold text-yellow-600">
                            {rule.results.filter(r => r.status === 'ignored').length}
                          </span>
                          <span className="text-muted-foreground ml-1">objetivo ≠</span>
                        </div>
                        <div className="text-center p-1 bg-red-50 dark:bg-red-950/30 rounded">
                          <span className="font-bold text-red-600">
                            {rule.results.filter(r => r.status === 'error').length}
                          </span>
                          <span className="text-muted-foreground ml-1">erros</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Timeout Message */}
          {isTimedOut && !completionUpdate && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-300">
                    Execução finalizada por timeout
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    A execução demorou mais que o esperado. Todas as ações executadas até este ponto foram salvas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Complete Message */}
          {completionUpdate && (
            <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="font-medium text-green-700 dark:text-green-300">
                {completionUpdate.message}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
