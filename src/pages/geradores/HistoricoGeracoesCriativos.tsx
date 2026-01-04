import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Filter, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HistoryEntry {
  id: string;
  client_id: string;
  creatives_requested: number;
  creatives_generated: number;
  execution_type: string;
  status: string;
  error_message: string | null;
  executed_at: string;
  clients?: {
    name: string;
    company: string;
  };
}

export default function HistoricoGeracoesCriativos() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;
  const [clientFilter, setClientFilter] = useState<string>("all");

  const { data: clients } = useQuery({
    queryKey: ["clients-for-history", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("clients")
        .select("id, name, company")
        .eq("company_id", companyId)
        .eq("is_canceled", false)
        .order("name");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: history, isLoading, refetch } = useQuery({
    queryKey: ["creative-generation-history", companyId, clientFilter],
    queryFn: async () => {
      if (!companyId) return [];
      
      let query = supabase
        .from("creative_generation_history")
        .select(`
          id,
          client_id,
          creatives_requested,
          creatives_generated,
          execution_type,
          status,
          error_message,
          executed_at,
          clients (name, company)
        `)
        .eq("company_id", companyId)
        .order("executed_at", { ascending: false })
        .limit(100);

      if (clientFilter !== "all") {
        query = query.eq("client_id", clientFilter);
      }

      const { data } = await query;
      return (data || []) as unknown as HistoryEntry[];
    },
    enabled: !!companyId,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "partial":
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Completo</Badge>;
      case "partial":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Parcial</Badge>;
      case "failed":
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Histórico de Gerações</h1>
          <p className="text-muted-foreground">Timeline de gerações automáticas</p>
        </div>
        <Card>
          <CardContent className="p-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b last:border-0">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Histórico de Gerações</h1>
          <p className="text-muted-foreground">Timeline de gerações automáticas</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients?.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {history?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Nenhuma geração registrada</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gerações Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {history?.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 py-3 px-3 hover:bg-muted/50 rounded-md"
                >
                  {getStatusIcon(entry.status)}
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {entry.clients?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.clients?.company}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm font-medium">
                      {entry.creatives_generated}/{entry.creatives_requested}
                    </p>
                    <p className="text-xs text-muted-foreground">criativos</p>
                  </div>

                  <Badge variant="outline" className="capitalize">
                    {entry.execution_type === "scheduled" ? "Agendado" : "Manual"}
                  </Badge>

                  {getStatusBadge(entry.status)}

                  <div className="text-right text-sm text-muted-foreground min-w-[140px]">
                    {format(new Date(entry.executed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
