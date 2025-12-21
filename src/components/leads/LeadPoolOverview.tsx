import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Users } from "lucide-react";
import { LeadClassificationStats } from "./LeadClassificationStats";

export const LeadPoolOverview = () => {
  const { activeCompany } = useCompany();

  const companyId = activeCompany?.company_id;

  const { data: stats } = useQuery({
    queryKey: ['lead-pool-stats', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      const { count: totalLeads } = await supabase
        .from('lead_master_pool')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);
      
      const { count: highScoreLeads } = await supabase
        .from('lead_master_pool')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('global_score', 70);
      
      const { count: convertedLeads } = await supabase
        .from('lead_master_pool')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gt('total_conversions', 0);
      
      const { data: valueData } = await supabase
        .from('lead_master_pool')
        .select('total_value')
        .eq('company_id', companyId);
      
      const totalValue = valueData?.reduce((sum, l) => sum + (l.total_value || 0), 0) || 0;
      
      return { totalLeads: totalLeads || 0, highScoreLeads: highScoreLeads || 0, convertedLeads: convertedLeads || 0, totalValue };
    },
    enabled: !!companyId
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Pool de Leads</h2>
        <p className="text-sm text-muted-foreground">Visão geral e estatísticas do pool de leads</p>
      </div>

      {/* Classification Stats */}
      <LeadClassificationStats />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Leads</p>
                <p className="text-2xl font-bold">{stats?.totalLeads?.toLocaleString() || 0}</p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Score Alto (≥70)</p>
                <p className="text-2xl font-bold">{stats?.highScoreLeads?.toLocaleString() || 0}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <span className="text-yellow-600 font-bold text-sm">★</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Convertidos</p>
                <p className="text-2xl font-bold">{stats?.convertedLeads?.toLocaleString() || 0}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-green-600 font-bold text-sm">✓</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">
                  R$ {stats?.totalValue?.toLocaleString('pt-BR', { minimumFractionDigits: 0 }) || 0}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold text-sm">$</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
