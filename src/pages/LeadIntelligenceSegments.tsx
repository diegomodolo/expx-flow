import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LeadIntelligenceLayout } from "@/components/leads/LeadIntelligenceLayout";
import { LeadSegmentsManager } from "@/components/leads/LeadSegmentsManager";

const LeadIntelligenceSegments = () => {
  return (
    <DashboardLayout>
      <LeadIntelligenceLayout>
        <LeadSegmentsManager />
      </LeadIntelligenceLayout>
    </DashboardLayout>
  );
};

export default LeadIntelligenceSegments;
