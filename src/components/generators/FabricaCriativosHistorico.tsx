import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Loader2, History, CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoryEntry {
  id: string;
  client_id: string;
  company_id: string;
  schedule_id: string | null;
  creatives_requested: number;
  creatives_generated: number;
  execution_type: string;
  status: string;
  execution_details: any;
  error_message: string | null;
  executed_at: string;
}

interface Props {
  clientId: string;
}

export function FabricaCriativosHistorico({ clientId }: Props) {
  const { activeCompany } = useCompany();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [clientId, activeCompany?.company_id]);

  const fetchHistory = async () => {
    if (!clientId || !activeCompany?.company_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('creative_generation_history')
        .select('*')
        .eq('client_id', clientId)
        .eq('company_id', activeCompany.company_id)
        .order('executed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'partial':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'in_progress':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completo</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500">Parcial</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500">Em Progresso</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de Geração
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma geração registrada ainda.
          </p>
        ) : (
          <div className="space-y-4">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-4 p-4 rounded-lg border"
              >
                {getStatusIcon(entry.status)}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusBadge(entry.status)}
                    <Badge variant="outline">
                      {entry.execution_type === 'manual' ? 'Manual' : 'Automático'}
                    </Badge>
                  </div>
                  
                  <p className="text-sm">
                    <strong>{entry.creatives_generated}</strong> de{' '}
                    <strong>{entry.creatives_requested}</strong> criativos gerados
                  </p>
                  
                  {entry.execution_details?.distribution && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Pesquisa: {entry.execution_details.distribution.concepts || 0} •
                      Iterações: {entry.execution_details.distribution.iterations || 0}
                    </p>
                  )}
                  
                  {entry.error_message && (
                    <p className="text-xs text-red-500 mt-1">
                      {entry.error_message}
                    </p>
                  )}
                </div>
                
                <div className="text-right text-sm text-muted-foreground">
                  {format(new Date(entry.executed_at), "dd MMM yyyy", { locale: ptBR })}
                  <br />
                  {format(new Date(entry.executed_at), "HH:mm", { locale: ptBR })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
