import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LeadIntelligenceLayout } from "@/components/leads/LeadIntelligenceLayout";
import { LeadSegmentsDashboard } from "@/components/leads/LeadSegmentsDashboard";
import { LeadImportModal } from "@/components/leads/LeadImportModal";
import { ListaCnaeSegmentModal } from "@/components/leads/ListaCnaeSegmentModal";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/contexts/CompanyContext";
import { useLeadScoring } from "@/hooks/useLeadScoring";
import { Upload, Calculator, Database, Plus } from "lucide-react";
import { toast } from "sonner";

const LeadIntelligenceSegmentsView = () => {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isListaCnaeModalOpen, setIsListaCnaeModalOpen] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const { scoreAllCompanyLeads } = useLeadScoring();

  // State to trigger segment dialog in child component
  const [openCreateSegmentDialog, setOpenCreateSegmentDialog] = useState(false);

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
    <DashboardLayout>
      <LeadIntelligenceLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Visão por Segmento</h2>
              <p className="text-sm text-muted-foreground">Dashboard de leads por segmento</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleRecalculateScores} disabled={isScoring}>
                <Calculator className="h-4 w-4 mr-2" />
                {isScoring ? "Calculando..." : "Recalcular Scores"}
              </Button>
              <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importar Leads
              </Button>
              <Button variant="outline" onClick={() => setIsListaCnaeModalOpen(true)}>
                <Database className="h-4 w-4 mr-2" />
                Novo com CNAE
              </Button>
              <Button onClick={() => setOpenCreateSegmentDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Segmento
              </Button>
            </div>
          </div>
          <LeadSegmentsDashboard 
            companyId={companyId || ""} 
            openCreateDialog={openCreateSegmentDialog}
            onCreateDialogChange={setOpenCreateSegmentDialog}
          />
        </div>

        <LeadImportModal
          open={isImportModalOpen}
          onOpenChange={setIsImportModalOpen}
          companyId={companyId || ""}
        />

        {companyId && (
          <ListaCnaeSegmentModal
            open={isListaCnaeModalOpen}
            onOpenChange={setIsListaCnaeModalOpen}
            companyId={companyId}
          />
        )}
      </LeadIntelligenceLayout>
    </DashboardLayout>
  );
};

export default LeadIntelligenceSegmentsView;
