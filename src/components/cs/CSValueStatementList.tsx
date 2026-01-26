import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useValueStatements, ValueStatement } from "@/hooks/useValueStatements";
import { FileCheck, Send, Eye, CheckCircle2, Plus, ExternalLink, TrendingUp, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { CSValueStatementModal } from "./CSValueStatementModal";
import { cn } from "@/lib/utils";

interface CSValueStatementListProps {
  clientId?: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Rascunho', color: 'bg-muted text-muted-foreground', icon: FileCheck },
  sent: { label: 'Enviado', color: 'bg-blue-500/10 text-blue-500', icon: Send },
  viewed: { label: 'Visualizado', color: 'bg-amber-500/10 text-amber-500', icon: Eye },
  approved: { label: 'Aprovado', color: 'bg-green-500/10 text-green-500', icon: CheckCircle2 },
};

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function CSValueStatementList({ clientId }: CSValueStatementListProps) {
  const { statements, approvalRate, isLoading, sendValueStatement } = useValueStatements(clientId);
  const [showModal, setShowModal] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Comprovantes de Valor
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
              <FileCheck className="h-5 w-5" />
              Comprovantes de Valor
            </CardTitle>
            <div className="flex items-center gap-3">
              {statements.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  Taxa de aprovação: {approvalRate}%
                </Badge>
              )}
              <Button size="sm" onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Novo Comprovante
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {statements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum comprovante criado ainda</p>
              <p className="text-sm mb-4">Crie comprovantes mensais de valor para seus clientes</p>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Criar Primeiro Comprovante
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {statements.map((statement) => {
                const config = statusConfig[statement.status] || statusConfig.draft;
                const StatusIcon = config.icon;
                const roi = statement.totalInvestment > 0 
                  ? ((statement.totalReturn - statement.totalInvestment) / statement.totalInvestment * 100).toFixed(1)
                  : '0';

                return (
                  <div
                    key={statement.id}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", config.color)}>
                        <StatusIcon className="h-6 w-6" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {statement.clients && (
                          <span className="font-medium">{statement.clients.name}</span>
                        )}
                        <Badge className={config.color}>{config.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {monthNames[statement.periodMonth - 1]} {statement.periodYear}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Invest: R$ {statement.totalInvestment.toLocaleString('pt-BR')}
                        </span>
                        <span className={cn(
                          "flex items-center gap-1 font-medium",
                          Number(roi) > 0 ? 'text-green-500' : 'text-red-500'
                        )}>
                          <TrendingUp className="h-3 w-3" />
                          ROI: {roi}%
                        </span>
                      </div>
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-2">
                      {statement.status === 'draft' && (
                        <Button 
                          size="sm" 
                          onClick={() => sendValueStatement.mutate(statement.id)}
                          disabled={sendValueStatement.isPending}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Enviar
                        </Button>
                      )}
                      {statement.publicToken && (
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

      <CSValueStatementModal
        open={showModal}
        onOpenChange={setShowModal}
        clientId={clientId}
      />
    </>
  );
}
