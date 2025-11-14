import { useState, useMemo } from "react";
import { ReportLayout, FilterConfig } from "@/components/reports/ReportLayout";
import { useBudgetAnalysis, BudgetStatus } from "@/hooks/useBudgetAnalysis";
import { BudgetOverviewCards } from "@/components/budget-dashboard/BudgetOverviewCards";
import { BudgetStatusChart } from "@/components/budget-dashboard/BudgetStatusChart";
import { TopClientsChart } from "@/components/budget-dashboard/TopClientsChart";
import { BudgetTrendChart } from "@/components/budget-dashboard/BudgetTrendChart";
import { BudgetAlerts } from "@/components/budget-dashboard/BudgetAlerts";
import { BudgetRankingTable } from "@/components/budget-dashboard/BudgetRankingTable";
import { Skeleton } from "@/components/ui/skeleton";

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
    const uniqueSectors = new Set(data.clients.map(c => c.sector).filter(s => s && s.trim() !== ''));
    return Array.from(uniqueSectors).sort();
  }, [data]);

  const primaryFilters: FilterConfig[] = [
    {
      id: 'status',
      label: 'Status do Orçamento',
      type: 'select',
      options: [
        { value: 'all', label: 'Todos' },
        { value: 'critical', label: '🔴 Crítico (>100%)' },
        { value: 'warning', label: '🟡 Atenção (90-100%)' },
        { value: 'healthy', label: '🟢 Saudável (<90%)' },
        { value: 'no-budget', label: '⚪ Sem orçamento' },
      ],
      placeholder: 'Todos',
      defaultValue: 'all'
    },
  ];

  const secondaryFilters: FilterConfig[] = [
    {
      id: 'sector',
      label: 'Setor',
      type: 'select',
      options: [
        { value: 'all', label: 'Todos os setores' },
        ...sectors.map(sector => ({ value: sector, label: sector }))
      ],
      placeholder: 'Todos os setores',
      defaultValue: 'all'
    },
  ];

  const handleFilterChange = (filterId: string, value: string) => {
    if (filterId === 'status') {
      setSelectedStatus(value as BudgetStatus | 'all');
    } else if (filterId === 'sector') {
      setSelectedSector(value);
    }
  };

  if (error) {
    return (
      <ReportLayout
        title="Análise de Orçamento"
        description="Monitoramento consolidado de orçamento vs. gasto de todos os clientes"
        primaryFilters={primaryFilters}
        secondaryFilters={secondaryFilters}
        onFilterChange={handleFilterChange}
      >
        <div className="text-center text-red-600 py-8">
          Erro ao carregar dados: {error.message}
        </div>
      </ReportLayout>
    );
  }

  return (
    <ReportLayout
      title="Análise de Orçamento"
      description="Monitoramento consolidado de orçamento vs. gasto de todos os clientes"
      primaryFilters={primaryFilters}
      secondaryFilters={secondaryFilters}
      onFilterChange={handleFilterChange}
      filterDescription="Filtre por status de utilização do orçamento e setor"
    >
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
        <div className="space-y-8">
          {/* Overview Cards */}
          <BudgetOverviewCards data={data} />

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
        </div>
      ) : null}
    </ReportLayout>
  );
}
