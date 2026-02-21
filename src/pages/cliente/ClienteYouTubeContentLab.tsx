import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useClientDetails } from "@/hooks/useClientDetails";
import { useCompany } from "@/contexts/CompanyContext";
import { useYouTubeContentLabs } from "@/hooks/useYouTubeContentLabs";
import { Loader2 } from "lucide-react";

export default function ClienteYouTubeContentLab() {
  const { id: clientId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { client, loading: clientLoading } = useClientDetails(clientId || "");
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id || client?.company_id || "";
  const { getOrCreateClientLab, loading: labsLoading } = useYouTubeContentLabs(companyId);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!clientId || !client || !companyId || labsLoading || redirecting) return;

    const redirect = async () => {
      setRedirecting(true);
      const labId = await getOrCreateClientLab(clientId, client.name);
      if (labId) {
        navigate(`/youtube-content-lab/${labId}`, { replace: true });
      }
    };

    redirect();
  }, [clientId, client, companyId, labsLoading]);

  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
