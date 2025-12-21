import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LeadIntelligenceLayout } from "@/components/leads/LeadIntelligenceLayout";
import { LeadPoolOverview } from "@/components/leads/LeadPoolOverview";

const LeadIntelligenceHub = () => {
  return (
    <DashboardLayout>
      <LeadIntelligenceLayout>
        <LeadPoolOverview />
      </LeadIntelligenceLayout>
    </DashboardLayout>
  );
};

export default LeadIntelligenceHub;
