import { useParams } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { ClientUrlsTab } from "@/components/clients/ClientUrlsTab";

export default function ClienteUrls() {
  const { id: clientId } = useParams<{ id: string }>();
  const { activeCompany } = useCompany();

  if (!clientId || !activeCompany) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">URLs do Cliente</h1>
        <p className="text-muted-foreground">
          Gerencie as URLs de destino utilizadas nas campanhas e valide seu funcionamento.
        </p>
      </div>

      <ClientUrlsTab 
        clientId={clientId} 
        companyId={activeCompany.company_id} 
      />
    </div>
  );
}
