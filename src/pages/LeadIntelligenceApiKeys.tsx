import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LeadIntelligenceLayout } from "@/components/leads/LeadIntelligenceLayout";
import { ApiKeysSettings } from "@/components/settings/ApiKeysSettings";

const LeadIntelligenceApiKeys = () => {
  return (
    <DashboardLayout>
      <LeadIntelligenceLayout>
        <ApiKeysSettings />
      </LeadIntelligenceLayout>
    </DashboardLayout>
  );
};

export default LeadIntelligenceApiKeys;
