import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, AlertCircle, TrendingUp, Package, Image, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AutomationProgressModalProps {
  open: boolean;
  executionId: string;
  clientId: string;
  onClose: () => void;
}

interface ProgressUpdate {
  id: string;
  entity_type: 'campaign' | 'adset' | 'ad';
  entity_name: string;
  status: 'processing' | 'evaluated' | 'actioned' | 'skipped' | 'error';
  rule_name: string;
  message: string;
  created_at: string;
}

export function AutomationProgressModal({
  open,
  executionId,
  clientId,
  onClose
}: AutomationProgressModalProps) {
  const [updates, setUpdates] = useState<ProgressUpdate[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const timeoutCheckRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open || !executionId) return;

    // Reset state
    setUpdates([]);
    setIsComplete(false);
    setIsTimedOut(false);
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
        setUpdates(prev => [...prev, newUpdate]);
        lastUpdateTimeRef.current = Date.now();
        
        if (newUpdate.rule_name === 'Conclusão') {
          setIsComplete(true);
        }
      })
      .subscribe();

    // Timeout detection - se não receber updates por 30 segundos, considerar como timeout
    timeoutCheckRef.current = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastUpdateTimeRef.current;
      if (timeSinceLastUpdate > 30000 && !isComplete) {
        setIsTimedOut(true);
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      if (timeoutCheckRef.current) {
        clearInterval(timeoutCheckRef.current);
      }
    };
  }, [open, executionId]);

  // Auto-scroll para o final
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [updates]);

  // Filtrar logs internos e conclusão
  const internalLogTypes = ['Consulta', 'Análise', 'Validação', 'Conclusão'];
  const actualUpdates = updates.filter(u => !internalLogTypes.includes(u.rule_name));
  const completionUpdate = updates.find(u => u.rule_name === 'Conclusão');
  
  // Calcular stats baseado apenas em logs reais (sem logs internos)
  const stats = {
    total: actualUpdates.length,
    actioned: actualUpdates.filter(u => u.status === 'actioned').length,
    skipped: actualUpdates.filter(u => u.status === 'skipped').length,
    errors: actualUpdates.filter(u => u.status === 'error').length,
    processing: actualUpdates.filter(u => u.status === 'processing').length
  };
  
  // Se existe mensagem de conclusão ou timeout, forçar 100%
  const progress = (completionUpdate || isTimedOut) 
    ? 100 
    : (stats.total > 0 ? Math.min(95, (stats.actioned + stats.skipped + stats.errors) / stats.total * 100) : 0);

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'campaign':
        return <TrendingUp className="h-4 w-4" />;
      case 'adset':
        return <Package className="h-4 w-4" />;
      case 'ad':
        return <Image className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'actioned':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'skipped':
        return <XCircle className="h-4 w-4 text-gray-400" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processing':
        return <Badge variant="outline" className="text-blue-500">Processando</Badge>;
      case 'actioned':
        return <Badge variant="outline" className="text-green-500">Ação Executada</Badge>;
      case 'skipped':
        return <Badge variant="outline" className="text-gray-400">Ignorado</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {completionUpdate ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : isTimedOut ? (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
            {completionUpdate ? "Execução Concluída" : isTimedOut ? "Execução Finalizada" : "Executando Automações..."}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.actioned}</div>
              <div className="text-xs text-muted-foreground">Ações</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-950 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{stats.skipped}</div>
              <div className="text-xs text-muted-foreground">Ignorados</div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
              <div className="text-xs text-muted-foreground">Erros</div>
            </div>
          </div>

          {/* Updates List */}
          <ScrollArea className="h-[400px] border rounded-lg p-4" ref={scrollRef}>
            <div className="space-y-3">
              {actualUpdates.length === 0 && !completionUpdate && !isTimedOut ? (
                <div className="text-center text-muted-foreground py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Iniciando execução...</p>
                </div>
              ) : (
                actualUpdates.map(update => (
                  <div key={update.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex-shrink-0 mt-0.5">
                      {getStatusIcon(update.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getEntityIcon(update.entity_type)}
                        <span className="font-medium text-sm truncate">
                          {update.entity_name}
                        </span>
                        {getStatusBadge(update.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Regra: {update.rule_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {update.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

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
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="font-medium text-green-700 dark:text-green-300">
                ✨ {completionUpdate.message}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}