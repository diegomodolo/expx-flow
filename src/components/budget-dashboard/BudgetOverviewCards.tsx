import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Activity, AlertTriangle } from "lucide-react";
import { BudgetAnalysis } from "@/hooks/useBudgetAnalysis";

interface BudgetOverviewCardsProps {
  data: BudgetAnalysis;
}

export function BudgetOverviewCards({ data }: BudgetOverviewCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const clientsInAlert = data.statusDistribution.critical + data.statusDistribution.warning;
  const totalClientsWithBudget = data.clients.filter(c => c.monthlyBudget > 0).length;
  const alertPercentage = totalClientsWithBudget > 0 
    ? Math.round((clientsInAlert / totalClientsWithBudget) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Orçamento Total Configurado
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data.totalBudget)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {data.clients.filter(c => c.monthlyBudget > 0).length} clientes com orçamento
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Gasto Atual Total
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data.totalSpend)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {data.overallUtilization.toFixed(1)}% do orçamento total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Utilização Média
          </CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.overallUtilization.toFixed(1)}%</div>
          <p className={`text-xs mt-1 ${
            data.overallUtilization > 100 ? 'text-red-600' : 
            data.overallUtilization >= 90 ? 'text-amber-600' : 
            'text-green-600'
          }`}>
            {data.overallUtilization > 100 ? '⬆️ Acima do orçamento' :
             data.overallUtilization >= 90 ? '⚠️ Próximo ao limite' :
             '✅ Dentro do esperado'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Clientes em Alerta
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{clientsInAlert}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {alertPercentage}% do total de clientes
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
