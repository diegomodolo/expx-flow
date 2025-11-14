import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export type BudgetStatus = 'critical' | 'warning' | 'healthy' | 'no-budget';

export interface BudgetClient {
  id: string;
  name: string;
  company: string;
  sector: string;
  avatar: string;
  monthlyBudget: number;
  currentSpend: number;
  utilizationPercentage: number;
  status: BudgetStatus;
  syncPeriod: number;
  expectedSpend: number;
  projectedMonthSpend: number;
  daysRemaining: number;
  projectedOverage: number;
  willExceedBudget: boolean;
}

export interface BudgetAnalysis {
  totalBudget: number;
  totalSpend: number;
  overallUtilization: number;
  statusDistribution: {
    critical: number;
    warning: number;
    healthy: number;
    noBudget: number;
  };
  clients: BudgetClient[];
  topOverBudget: BudgetClient[];
  topUnderBudget: BudgetClient[];
}

interface BudgetFilters {
  status?: BudgetStatus | 'all';
  sector?: string;
  budgetRange?: [number, number];
}

export function useBudgetAnalysis(filters?: BudgetFilters) {
  const { activeCompany } = useCompany();

  return useQuery({
    queryKey: ['budget-analysis', activeCompany?.company_id, filters],
    queryFn: async (): Promise<BudgetAnalysis> => {
      if (!activeCompany?.company_id) {
        throw new Error('No company selected');
      }

      // Fetch clients with their budget and sync period data
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name, company, sector, avatar, monthly_budget, last_sync_period')
        .eq('company_id', activeCompany.company_id)
        .order('name');

      if (error) throw error;

      const daysInMonth = 30;
      const processedClients: BudgetClient[] = [];
      let totalBudget = 0;
      let totalSpend = 0;

      const statusDistribution = {
        critical: 0,
        warning: 0,
        healthy: 0,
        noBudget: 0,
      };

      // Process each client and calculate spend from campaigns
      for (const client of clients || []) {
        const monthlyBudget = client.monthly_budget || 0;
        
        // Get total spend from campaigns
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('spend')
          .eq('client_id', client.id);
        
        const currentSpend = campaigns?.reduce((sum, c) => sum + (c.spend || 0), 0) || 0;
        
        // Parse sync period (format: "últimos X dias")
        const syncPeriodMatch = client.last_sync_period?.match(/\d+/);
        const syncPeriod = syncPeriodMatch ? parseInt(syncPeriodMatch[0]) : daysInMonth;
        
        // Calculate expected spend proportional to sync period
        const expectedSpend = monthlyBudget > 0 ? (monthlyBudget / daysInMonth) * syncPeriod : 0;
        
        // Calculate utilization percentage
        const utilizationPercentage = expectedSpend > 0 
          ? Math.round((currentSpend / expectedSpend) * 100 * 10) / 10
          : 0;
        
        // Project monthly spend based on current rate
        const dailySpendRate = syncPeriod > 0 ? currentSpend / syncPeriod : 0;
        const projectedMonthSpend = dailySpendRate * daysInMonth;
        
        // Calculate days remaining and projected overage
        const daysRemaining = Math.max(0, daysInMonth - syncPeriod);
        const projectedOverage = projectedMonthSpend - monthlyBudget;
        const willExceedBudget = projectedOverage > 0;

        // Determine status
        let status: BudgetStatus;
        if (monthlyBudget === 0) {
          status = 'no-budget';
          statusDistribution.noBudget++;
        } else if (utilizationPercentage > 100) {
          status = 'critical';
          statusDistribution.critical++;
        } else if (utilizationPercentage >= 90) {
          status = 'warning';
          statusDistribution.warning++;
        } else {
          status = 'healthy';
          statusDistribution.healthy++;
        }

        // Apply filters
        let includeClient = true;
        
        if (filters?.status && filters.status !== 'all' && status !== filters.status) {
          includeClient = false;
        }
        
        if (filters?.sector && client.sector !== filters.sector) {
          includeClient = false;
        }
        
        if (filters?.budgetRange) {
          const [min, max] = filters.budgetRange;
          if (monthlyBudget < min || monthlyBudget > max) {
            includeClient = false;
          }
        }

        if (includeClient) {
          processedClients.push({
            id: client.id,
            name: client.name,
            company: client.company,
            sector: client.sector,
            avatar: client.avatar,
            monthlyBudget,
            currentSpend,
            utilizationPercentage,
            status,
            syncPeriod,
            expectedSpend,
            projectedMonthSpend,
            daysRemaining,
            projectedOverage,
            willExceedBudget,
          });

          if (monthlyBudget > 0) {
            totalBudget += monthlyBudget;
            totalSpend += currentSpend;
          }
        }
      }

      const overallUtilization = totalBudget > 0 
        ? Math.round((totalSpend / totalBudget) * 100 * 10) / 10
        : 0;

      // Sort clients by utilization for top lists
      const sortedByUtilization = [...processedClients]
        .filter(c => c.monthlyBudget > 0)
        .sort((a, b) => b.utilizationPercentage - a.utilizationPercentage);

      const topOverBudget = sortedByUtilization
        .filter(c => c.utilizationPercentage > 100)
        .slice(0, 10);

      const topUnderBudget = sortedByUtilization
        .filter(c => c.utilizationPercentage < 100)
        .sort((a, b) => a.utilizationPercentage - b.utilizationPercentage)
        .slice(0, 10);

      return {
        totalBudget,
        totalSpend,
        overallUtilization,
        statusDistribution,
        clients: processedClients,
        topOverBudget,
        topUnderBudget,
      };
    },
    enabled: !!activeCompany?.company_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
