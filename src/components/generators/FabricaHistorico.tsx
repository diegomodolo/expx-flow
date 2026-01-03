import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, History, CheckCircle2, AlertCircle, XCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoryEntry {
  id: string;
  executed_at: string;
  ads_requested: number;
  ads_generated: number;
  execution_type: string;
  status: string;
  error_message: string | null;
  execution_details: any;
}

interface Props {
  clientId: string;
}

export function FabricaHistorico({ clientId }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [clientId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ad_generation_history')
        .select('*')
        .eq('client_id', clientId)
        .order('executed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">Completo</Badge>;
      case 'partial':
        return <Badge variant="default" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Parcial</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getExecutionTypeBadge = (type: string) => {
    return type === 'scheduled' 
      ? <Badge variant="outline">Agendado</Badge>
      : <Badge variant="secondary">Manual</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Geração
          </h3>
          <p className="text-sm text-muted-foreground">
            Registro de todas as execuções automáticas da fábrica de anúncios
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadHistory}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {history.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <History className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhuma geração automática foi executada ainda.
            </p>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Configure a geração diária na aba "Geral" para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => {
            const distribution = entry.execution_details?.distribution;
            
            return (
              <Card key={entry.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(entry.status)}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {format(new Date(entry.executed_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </span>
                          {getStatusBadge(entry.status)}
                          {getExecutionTypeBadge(entry.execution_type)}
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">{entry.ads_generated}</span>
                          {' '}de{' '}
                          <span>{entry.ads_requested}</span>
                          {' '}criativos gerados
                        </div>

                        {distribution && (
                          <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                            {distribution.clones > 0 && (
                              <span>Clones: {distribution.clones}</span>
                            )}
                            {distribution.concepts > 0 && (
                              <span>Conceitos: {distribution.concepts}</span>
                            )}
                            {distribution.iterations > 0 && (
                              <span>Iterações: {distribution.iterations}</span>
                            )}
                          </div>
                        )}

                        {entry.error_message && (
                          <p className="text-xs text-red-500 mt-2">
                            {entry.error_message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
