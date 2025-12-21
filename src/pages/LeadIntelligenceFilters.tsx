import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LeadIntelligenceLayout } from "@/components/leads/LeadIntelligenceLayout";
import { LeadSavedFiltersTab } from "@/components/leads/LeadSavedFiltersTab";
import { useCompany } from "@/contexts/CompanyContext";

const LeadIntelligenceFilters = () => {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;

  return (
    <DashboardLayout>
      <LeadIntelligenceLayout>
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Filtros Salvos</h2>
            <p className="text-sm text-muted-foreground">Filtros personalizados para busca de leads</p>
          </div>
          <LeadSavedFiltersTab companyId={companyId || ""} />
        </div>
      </LeadIntelligenceLayout>
    </DashboardLayout>
  );
};

export default LeadIntelligenceFilters;
