import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useBudgetAnalysis, BudgetStatus } from "@/hooks/useBudgetAnalysis";
import { BudgetOverviewCards } from "@/components/budget-dashboard/BudgetOverviewCards";
import { BudgetStatusChart } from "@/components/budget-dashboard/BudgetStatusChart";
import { TopClientsChart } from "@/components/budget-dashboard/TopClientsChart";
import { BudgetTrendChart } from "@/components/budget-dashboard/BudgetTrendChart";
import { BudgetAlerts } from "@/components/budget-dashboard/BudgetAlerts";
import { BudgetRankingTable } from "@/components/budget-dashboard/BudgetRankingTable";
import { BudgetFilters } from "@/components/budget-dashboard/BudgetFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart } from "lucide-react";

export default function DashboardOrcamento() {
  const [selectedStatus, setSelectedStatus] = useState<BudgetStatus | 'all'>('all');
  const [selectedSector, setSelectedSector] = useState('all');
  const [budgetRange, setBudgetRange] = useState<[number, number]>([0, 50000]);

  const filters = useMemo(() => ({
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
    sector: selectedSector !== 'all' ? selectedSector : undefined,
    budgetRange,
  }), [selectedStatus, selectedSector, budgetRange]);

  const { data, isLoading, error } = useBudgetAnalysis(filters);

  // Get unique sectors for filter
  const sectors = useMemo(() => {
    if (!data) return [];
    const uniqueSectors = new Set(data.clients.map(c => c.sector));
    return Array.from(uniqueSectors).sort();
  }, [data]);

  if (error) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <div className="text-center text-red-600">
            Erro ao carregar dados: {error.message}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <PieChart className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Dashboard de Análise de Orçamento</h1>
            <p className="text-muted-foreground">
              Monitoramento consolidado de orçamento vs. gasto de todos os clientes
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-96" />
              ))}
            </div>
          </div>
        ) : data ? (
          <>
            {/* Filters */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <BudgetFilters
                selectedStatus={selectedStatus}
                onStatusChange={setSelectedStatus}
                selectedSector={selectedSector}
                onSectorChange={setSelectedSector}
                sectors={sectors}
                budgetRange={budgetRange}
                onBudgetRangeChange={setBudgetRange}
              />
              
              <div className="lg:col-span-3">
                {/* Overview Cards */}
                <BudgetOverviewCards data={data} />
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <BudgetStatusChart data={data} />
              <TopClientsChart data={data} />
            </div>

            {/* Trend Chart */}
            <BudgetTrendChart 
              totalBudget={data.totalBudget} 
              totalSpend={data.totalSpend} 
            />

            {/* Alerts */}
            <BudgetAlerts clients={data.clients} />

            {/* Ranking Table */}
            <BudgetRankingTable clients={data.clients} />
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
