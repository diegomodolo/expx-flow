import { useParams } from "react-router-dom";
import { LeadDisqualificationTab } from "@/components/clients/LeadDisqualificationTab";

export function ClienteLeadsDesqualificados() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Leads Desqualificados</h3>
      <LeadDisqualificationTab clientId={id || ""} />
    </div>
  );
}
