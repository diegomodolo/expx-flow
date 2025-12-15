import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiKeysSettings } from "@/components/settings/ApiKeysSettings";
import { LeadSegmentsManager } from "@/components/leads/LeadSegmentsManager";
import { LeadPoolDashboard } from "@/components/leads/LeadPoolDashboard";
import { Brain, Key, Tags, Users } from "lucide-react";

const LeadIntelligenceHub = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Lead Intelligence Hub
          </h1>
          <p className="text-muted-foreground">
            Central de inteligência para captação, deduplicação e segmentação de leads
          </p>
        </div>

        <Tabs defaultValue="leads" className="space-y-6">
          <TabsList>
            <TabsTrigger value="leads" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Pool de Leads
            </TabsTrigger>
            <TabsTrigger value="segments" className="flex items-center gap-2">
              <Tags className="h-4 w-4" />
              Segmentos
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leads">
            <LeadPoolDashboard />
          </TabsContent>

          <TabsContent value="segments">
            <LeadSegmentsManager />
          </TabsContent>

          <TabsContent value="api">
            <ApiKeysSettings />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default LeadIntelligenceHub;
