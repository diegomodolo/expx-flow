import { useLocation, useNavigate, useParams } from "react-router-dom";
import { CRMSettingsLayout } from "@/components/crm/settings/CRMSettingsLayout";
import { GeneralSettings } from "@/components/crm/settings/GeneralSettings";
import { TagsSettings } from "@/components/crm/settings/TagsSettings";
import { GoalsSettings } from "@/components/crm/settings/GoalsSettings";
import { PipelineSettings } from "@/components/crm/settings/PipelineSettings";
import { useEffect } from "react";

interface ClienteCRMSettingsProps {
  workspaceId: string;
  workspaceToken: string;
}

export function ClienteCRMSettings({ workspaceId, workspaceToken }: ClienteCRMSettingsProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname.split("/").pop();

  // Redirecionar para geral se estiver na raiz de settings
  useEffect(() => {
    if (location.pathname === `/crm/${workspaceToken}` || location.pathname === `/crm/${workspaceToken}/settings`) {
      navigate(`/crm/${workspaceToken}/settings/geral`, { replace: true });
    }
  }, [location.pathname, navigate, workspaceToken]);

  const renderContent = () => {
    switch (currentPath) {
      case "geral":
        return <GeneralSettings workspaceId={workspaceId} />;
      case "tags":
        return <TagsSettings workspaceId={workspaceId} />;
      case "metas":
        return <GoalsSettings workspaceId={workspaceId} />;
      case "funil":
        return <PipelineSettings workspaceId={workspaceId} />;
      default:
        return <GeneralSettings workspaceId={workspaceId} />;
    }
  };

  return (
    <div className="px-8 py-8 h-full">
      <CRMSettingsLayout workspaceToken={workspaceToken}>
        {renderContent()}
      </CRMSettingsLayout>
    </div>
  );
}
