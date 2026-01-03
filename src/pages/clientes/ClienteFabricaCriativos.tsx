import { useParams, useNavigate } from "react-router-dom";
import { ClienteConfiguracaoFabricaCriativos } from "@/components/generators/ClienteConfiguracaoFabricaCriativos";

export default function ClienteFabricaCriativos() {
  const { id: clientId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!clientId) {
    return <div>Cliente não encontrado</div>;
  }

  const handleDelete = () => {
    navigate(`/clientes/${clientId}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fábrica de Criativos</h1>
        <p className="text-muted-foreground">Configure a geração automática de criativos para redes sociais</p>
      </div>
      <ClienteConfiguracaoFabricaCriativos 
        clientId={clientId} 
        onDelete={handleDelete}
      />
    </div>
  );
}
