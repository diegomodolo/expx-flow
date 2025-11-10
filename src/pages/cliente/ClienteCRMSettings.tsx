import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { CRMSettingsLayout } from "@/components/crm/settings/CRMSettingsLayout";
import { GeneralSettings } from "@/components/crm/settings/GeneralSettings";
import { TagsSettings } from "@/components/crm/settings/TagsSettings";
import { GoalsSettings } from "@/components/crm/settings/GoalsSettings";
import { PipelineSettings } from "@/components/crm/settings/PipelineSettings";

interface ClienteCRMSettingsProps {
  workspaceId: string;
  workspaceToken: string;
}

export function ClienteCRMSettings({ workspaceId, workspaceToken }: ClienteCRMSettingsProps) {
  return (
    <div className="px-8 py-8 h-full">
      <CRMSettingsLayout workspaceToken={workspaceToken}>
        <Routes>
          <Route index element={<Navigate to="geral" replace />} />
          <Route path="geral" element={<GeneralSettings workspaceId={workspaceId} />} />
          <Route path="tags" element={<TagsSettings workspaceId={workspaceId} />} />
          <Route path="metas" element={<GoalsSettings workspaceId={workspaceId} />} />
          <Route path="funil" element={<PipelineSettings workspaceId={workspaceId} />} />
        </Routes>
      </CRMSettingsLayout>
    </div>
  );
}
