import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LeadIntelligenceLayout } from "@/components/leads/LeadIntelligenceLayout";
import { LeadHistoryTab } from "@/components/leads/LeadHistoryTab";
import { useCompany } from "@/contexts/CompanyContext";

const LeadIntelligenceHistory = () => {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;

  return (
    <DashboardLayout>
      <LeadIntelligenceLayout>
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Histórico</h2>
            <p className="text-sm text-muted-foreground">Log de atividades dos leads</p>
          </div>
          <LeadHistoryTab companyId={companyId || ""} />
        </div>
      </LeadIntelligenceLayout>
    </DashboardLayout>
  );
};

export default LeadIntelligenceHistory;
