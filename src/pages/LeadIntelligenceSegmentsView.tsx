import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LeadIntelligenceLayout } from "@/components/leads/LeadIntelligenceLayout";
import { LeadSegmentsDashboard } from "@/components/leads/LeadSegmentsDashboard";
import { useCompany } from "@/contexts/CompanyContext";

const LeadIntelligenceSegmentsView = () => {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;

  return (
    <DashboardLayout>
      <LeadIntelligenceLayout>
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Visão por Segmento</h2>
            <p className="text-sm text-muted-foreground">Dashboard de leads por segmento</p>
          </div>
          <LeadSegmentsDashboard companyId={companyId || ""} />
        </div>
      </LeadIntelligenceLayout>
    </DashboardLayout>
  );
};

export default LeadIntelligenceSegmentsView;
