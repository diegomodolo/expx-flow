import { useParams, useNavigate } from "react-router-dom";
import { ClienteConfiguracaoFabricaCarrosseis } from "@/components/generators/ClienteConfiguracaoFabricaCarrosseis";

export default function ClienteFabricaCarrosseis() {
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
        <h1 className="text-2xl font-bold">Fábrica de Carrosseis</h1>
        <p className="text-muted-foreground">Configure a geração automática de carrosseis para Instagram</p>
      </div>
      <ClienteConfiguracaoFabricaCarrosseis 
        clientId={clientId} 
        onDelete={handleDelete}
      />
    </div>
  );
}
