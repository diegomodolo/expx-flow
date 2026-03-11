import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useUserReports } from "@/hooks/useUserReports";
import { useCompany } from "@/contexts/CompanyContext";
import { ReportStatusCards } from "@/components/reportes/ReportStatusCards";
import { ReportList } from "@/components/reportes/ReportList";
import { NewReportDialog } from "@/components/reportes/NewReportDialog";

type TabFilter = "todos" | "bug" | "feature";

export function ReportesPage() {
  const { activeCompany } = useCompany();
  const { data: reports = [], isLoading } = useUserReports(activeCompany?.company_id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>("todos");

  const filteredReports =
    activeTab === "todos"
      ? reports
      : reports.filter((r) => r.type === activeTab);

  return (
    <DashboardLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="text-sm text-muted-foreground">
            Reporte bugs e sugira novas funcionalidades
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Reporte
        </Button>
      </div>

      {/* Status Cards */}
      <ReportStatusCards reports={reports} />

      {/* Tabs + List */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFilter)}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="bug">Bugs</TabsTrigger>
          <TabsTrigger value="feature">Features</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Carregando reportes...
        </div>
      ) : (
        <ReportList
          reports={filteredReports}
          companyId={activeCompany?.company_id || ""}
        />
      )}

      {/* New Report Dialog */}
      <NewReportDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
    </DashboardLayout>
  );
}
