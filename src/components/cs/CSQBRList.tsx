import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQBRReports, QBRReport } from "@/hooks/useQBRReports";
import { Calendar, FileText, ExternalLink, Eye, Clock, Sparkles, Plus } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { CSQBRGeneratorModal } from "./CSQBRGeneratorModal";

interface CSQBRListProps {
  clientId?: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-muted text-muted-foreground' },
  scheduled: { label: 'Agendado', color: 'bg-blue-500/10 text-blue-500' },
  presented: { label: 'Apresentado', color: 'bg-green-500/10 text-green-500' },
  archived: { label: 'Arquivado', color: 'bg-muted text-muted-foreground' },
};

export function CSQBRList({ clientId }: CSQBRListProps) {
  const { reports, isLoading, qbrOverdue } = useQBRReports(clientId);
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(clientId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Relatórios QBR
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Relatórios QBR
            </CardTitle>
            <div className="flex items-center gap-2">
              {qbrOverdue.length > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {qbrOverdue.length} QBR(s) atrasado(s)
                </Badge>
              )}
              <Button size="sm" onClick={() => setShowGenerator(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Novo QBR
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum QBR criado ainda</p>
              <p className="text-sm mb-4">Crie o primeiro relatório trimestral</p>
              <Button onClick={() => setShowGenerator(true)}>
                <Sparkles className="h-4 w-4 mr-1" />
                Gerar QBR com IA
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((qbr) => {
                const status = statusConfig[qbr.status] || statusConfig.draft;
                const isOverdue = qbr.presentedAt 
                  ? Math.floor((Date.now() - new Date(qbr.presentedAt).getTime()) / (1000 * 60 * 60 * 24)) > 85
                  : true;

                return (
                  <div
                    key={qbr.id}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {qbr.clients && (
                          <span className="font-medium">{qbr.clients.name}</span>
                        )}
                        <Badge className={status.color}>{status.label}</Badge>
                        {isOverdue && qbr.status !== 'draft' && (
                          <Badge variant="destructive" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            +85 dias
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Período: {format(new Date(qbr.periodStart), 'dd/MM/yyyy', { locale: ptBR })} - {format(new Date(qbr.periodEnd), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                      {qbr.presentedAt && (
                        <p className="text-xs text-muted-foreground">
                          Apresentado {formatDistanceToNow(new Date(qbr.presentedAt), { addSuffix: true, locale: ptBR })}
                        </p>
                      )}
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-2">
                      {qbr.viewCount > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <Eye className="h-3 w-3 mr-1" />
                          {qbr.viewCount}
                        </Badge>
                      )}
                      {qbr.publicToken && (
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <CSQBRGeneratorModal
        open={showGenerator}
        onOpenChange={setShowGenerator}
        clientId={selectedClientId}
      />
    </>
  );
}
