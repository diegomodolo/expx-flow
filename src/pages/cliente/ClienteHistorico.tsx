import { User } from "lucide-react";
import { useClientContext } from "./ClienteContext";

export function ClienteHistorico() {
  const { client } = useClientContext();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Histórico de Interações</h3>
      
      <div className="space-y-6">
        <div className="flex items-start space-x-4">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h5 className="text-sm font-medium">Cliente criado</h5>
              <span className="text-xs text-gray-500">
                Criado no sistema
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Cliente {client.name} foi adicionado ao sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
