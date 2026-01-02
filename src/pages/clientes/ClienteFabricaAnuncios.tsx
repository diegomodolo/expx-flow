import { useParams, useNavigate } from "react-router-dom";
import { ClienteConfiguracaoFabrica } from "@/components/generators/ClienteConfiguracaoFabrica";

export default function ClienteFabricaAnuncios() {
  const { id: clientId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!clientId) {
    return <div>Cliente não encontrado</div>;
  }

  const handleDelete = () => {
    // After deletion, go back to client dashboard
    navigate(`/clientes/${clientId}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fábrica de Anúncios</h1>
        <p className="text-muted-foreground">Configure a geração automática de anúncios para este cliente</p>
      </div>
      <ClienteConfiguracaoFabrica 
        clientId={clientId} 
        onDelete={handleDelete}
      />
    </div>
  );
}
