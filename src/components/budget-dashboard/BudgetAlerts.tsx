import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { BudgetClient } from "@/hooks/useBudgetAnalysis";
import { useNavigate } from "react-router-dom";

interface BudgetAlertsProps {
  clients: BudgetClient[];
}

export function BudgetAlerts({ clients }: BudgetAlertsProps) {
  const navigate = useNavigate();

  // Get top 5 most critical clients
  const criticalClients = [...clients]
    .filter(c => c.monthlyBudget > 0 && (c.utilizationPercentage >= 90 || c.willExceedBudget))
    .sort((a, b) => b.utilizationPercentage - a.utilizationPercentage)
    .slice(0, 5);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (client: BudgetClient) => {
    if (client.utilizationPercentage > 100) {
      return <Badge variant="destructive">Crítico</Badge>;
    }
    if (client.utilizationPercentage >= 90) {
      return <Badge className="bg-amber-500 hover:bg-amber-600">Atenção</Badge>;
    }
    return <Badge className="bg-green-500 hover:bg-green-600">Saudável</Badge>;
  };

  if (criticalClients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alertas Críticos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            ✅ Nenhum alerta crítico no momento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Alertas Críticos ({criticalClients.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {criticalClients.map((client) => (
            <div key={client.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <Avatar className="h-10 w-10">
                <AvatarImage src={client.avatar} alt={client.name} />
                <AvatarFallback>{client.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm truncate">{client.name}</h4>
                  {getStatusBadge(client)}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-2">
                  <div>
                    <span className="font-medium">Orçamento:</span> {formatCurrency(client.monthlyBudget)}
                  </div>
                  <div>
                    <span className="font-medium">Gasto:</span> {formatCurrency(client.currentSpend)}
                  </div>
                  <div>
                    <span className="font-medium">Utilização:</span> {client.utilizationPercentage.toFixed(1)}%
                  </div>
                  <div>
                    <span className="font-medium">Período:</span> {client.syncPeriod} dias
                  </div>
                </div>

                {client.willExceedBudget && (
                  <p className="text-xs text-red-600 font-medium">
                    ⚠️ Projeção: {formatCurrency(client.projectedMonthSpend)} 
                    ({formatCurrency(client.projectedOverage)} acima do orçamento)
                  </p>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/cliente/${client.id}`)}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
