import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useBacklogCommandCenter } from "@/hooks/useBacklogCommandCenter";
import { useCompany } from "@/contexts/CompanyContext";
import { BacklogHeader } from "@/components/backlog-center/BacklogHeader";
import { BacklogClientSidebar } from "@/components/backlog-center/BacklogClientSidebar";
import { BacklogBucket } from "@/components/backlog-center/BacklogBucket";
import { BacklogFooterBar } from "@/components/backlog-center/BacklogFooterBar";
import { useState } from "react";

export default function BacklogCommandCenterPage() {
  const { activeCompany } = useCompany();
  const {
    backlogClients,
    filteredTasks,
    tasksLoading,
    selectedClientId,
    setSelectedClientId,
    selectedTaskIds,
    toggleTaskSelection,
    selectAll,
    clearSelection,
    selectionStats,
    totalStats,
    getReadiness,
    getAgingHours,
    releaseToLeaders,
    clients,
  } = useBacklogCommandCenter();

  const [releasing, setReleasing] = useState(false);

  const handleRelease = async () => {
    if (selectedTaskIds.size === 0) return;
    setReleasing(true);
    try {
      await releaseToLeaders(Array.from(selectedTaskIds));
    } finally {
      setReleasing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Header */}
        <BacklogHeader totalStats={totalStats} />

        {/* Main content: Sidebar + Bucket */}
        <div className="flex flex-1 min-h-0">
          {/* Zone A: Client Sidebar */}
          <BacklogClientSidebar
            clients={backlogClients}
            selectedClientId={selectedClientId}
            onSelectClient={setSelectedClientId}
            totalStats={totalStats}
          />

          {/* Zone B: Bucket */}
          <BacklogBucket
            tasks={filteredTasks}
            loading={tasksLoading}
            selectedTaskIds={selectedTaskIds}
            onToggleTask={toggleTaskSelection}
            getReadiness={getReadiness}
            getAgingHours={getAgingHours}
            clients={clients}
            companyId={activeCompany?.company_id}
          />
        </div>

        {/* Zone C: Footer */}
        <BacklogFooterBar
          selectionStats={selectionStats}
          onRelease={handleRelease}
          onClear={clearSelection}
          onSelectAll={selectAll}
          releasing={releasing}
        />
      </div>
    </DashboardLayout>
  );
}
