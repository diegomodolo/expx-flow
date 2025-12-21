import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Users, Upload, Calculator } from "lucide-react";
import { toast } from "sonner";
import { LeadImportModal } from "./LeadImportModal";
import { LeadClassificationStats } from "./LeadClassificationStats";
import { useLeadScoring } from "@/hooks/useLeadScoring";

export const LeadPoolOverview = () => {
  const queryClient = useQueryClient();
  const { activeCompany } = useCompany();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

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

  const { scoreAllCompanyLeads } = useLeadScoring();
  const [isScoring, setIsScoring] = useState(false);

  const handleRecalculateScores = async () => {
    setIsScoring(true);
    try {
      const count = await scoreAllCompanyLeads();
      toast.success(`${count} leads recalculados com sucesso`);
      queryClient.invalidateQueries({ queryKey: ['lead-pool'] });
      queryClient.invalidateQueries({ queryKey: ['lead-classification-stats'] });
      queryClient.invalidateQueries({ queryKey: ['lead-segments-dashboard'] });
    } catch (error) {
      toast.error("Erro ao recalcular scores");
    } finally {
      setIsScoring(false);
    }
  };

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

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleRecalculateScores} disabled={isScoring}>
          <Calculator className="h-4 w-4 mr-2" />
          {isScoring ? "Calculando..." : "Recalcular Scores"}
        </Button>
        <Button onClick={() => setIsImportModalOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Importar Leads
        </Button>
      </div>

      <LeadImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        companyId={companyId || ""}
      />
    </div>
  );
};
