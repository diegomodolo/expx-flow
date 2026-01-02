import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/hooks/useClients";
import { useCompany } from "@/contexts/CompanyContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Clock, CheckCircle, XCircle, Send, Sparkles, Copy, RefreshCw } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GenerationRecord {
  id: string;
  generation_type: 'clone' | 'concept' | 'iteration';
  status: 'pending' | 'approved' | 'rejected' | 'published';
  quality_score: number | null;
  generated_at: string;
  reviewed_at: string | null;
  published_at: string | null;
  generated_content: {
    headline?: string;
    primary_text?: string;
  };
  client_id: string;
}

const statusConfig = {
  pending: { label: 'Pendente', icon: Clock, color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  approved: { label: 'Aprovado', icon: CheckCircle, color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  rejected: { label: 'Rejeitado', icon: XCircle, color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  published: { label: 'Publicado', icon: Send, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
};

const typeConfig = {
  clone: { label: 'Clone', icon: Copy, color: 'text-purple-400' },
  concept: { label: 'Conceito', icon: Sparkles, color: 'text-cyan-400' },
  iteration: { label: 'Iteração', icon: RefreshCw, color: 'text-orange-400' },
};

export default function HistoricoGeracoes() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const { clients } = useClients();
  const { activeCompany } = useCompany();

  const { data: generations, isLoading } = useQuery({
    queryKey: ['generation-history', selectedClientId, activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];

      let query = supabase
        .from('ad_generation_queue')
        .select('*')
        .eq('company_id', activeCompany.company_id)
        .order('generated_at', { ascending: false })
        .limit(100);

      if (selectedClientId) {
        query = query.eq('client_id', selectedClientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as GenerationRecord[];
    },
    enabled: !!activeCompany?.company_id,
  });

  const groupByDate = (records: GenerationRecord[]) => {
    const groups: Record<string, GenerationRecord[]> = {};
    
    records.forEach(record => {
      const date = format(new Date(record.generated_at), 'yyyy-MM-dd');
      if (!groups[date]) groups[date] = [];
      groups[date].push(record);
    });

    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  };

  const getClientName = (clientId: string) => {
    return clients?.find(c => c.id === clientId)?.name || 'Cliente';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Histórico de Gerações</h1>
            <p className="text-muted-foreground">Timeline completa de anúncios gerados pela IA</p>
          </div>

          <Select
            value={selectedClientId || "all"}
            onValueChange={(value) => setSelectedClientId(value === "all" ? null : value)}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Todos os clientes" />
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
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !generations?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma geração encontrada</p>
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-8">
              {groupByDate(generations).map(([date, records]) => (
                <div key={date} className="relative">
                  {/* Date marker */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center z-10">
                      <span className="text-primary-foreground text-sm font-bold">
                        {format(new Date(date), 'dd')}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold">
                        {format(new Date(date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {records.length} geração(ões)
                      </p>
                    </div>
                  </div>

                  {/* Records for this date */}
                  <div className="ml-16 space-y-3">
                    {records.map((record) => {
                      const StatusIcon = statusConfig[record.status].icon;
                      const TypeIcon = typeConfig[record.generation_type].icon;
                      const content = record.generated_content as { headline?: string; primary_text?: string };

                      return (
                        <Card key={record.id} className="overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <TypeIcon className={`h-4 w-4 ${typeConfig[record.generation_type].color}`} />
                                  <span className="text-sm font-medium">
                                    {typeConfig[record.generation_type].label}
                                  </span>
                                  <span className="text-muted-foreground">•</span>
                                  <span className="text-sm text-muted-foreground">
                                    {getClientName(record.client_id)}
                                  </span>
                                  <span className="text-muted-foreground">•</span>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(record.generated_at), 'HH:mm')}
                                  </span>
                                </div>

                                <p className="font-medium truncate">
                                  {content?.headline || 'Anúncio sem título'}
                                </p>
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                  {content?.primary_text || 'Sem texto principal'}
                                </p>
                              </div>

                              <div className="flex flex-col items-end gap-2">
                                <Badge variant="outline" className={statusConfig[record.status].color}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {statusConfig[record.status].label}
                                </Badge>

                                {record.quality_score && (
                                  <span className="text-xs text-muted-foreground">
                                    Score: {record.quality_score}/10
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Timeline markers */}
                            {(record.reviewed_at || record.published_at) && (
                              <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
                                {record.reviewed_at && (
                                  <span>
                                    Revisado {formatDistanceToNow(new Date(record.reviewed_at), { addSuffix: true, locale: ptBR })}
                                  </span>
                                )}
                                {record.published_at && (
                                  <span>
                                    Publicado {formatDistanceToNow(new Date(record.published_at), { addSuffix: true, locale: ptBR })}
                                  </span>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
