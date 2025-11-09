import { Mail, Building, User } from "lucide-react";
import { useClientContext } from "./ClienteContext";

export function ClienteContato() {
  const { client } = useClientContext();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Informações de Contato & Dados</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div>
          <h4 className="text-base font-semibold mb-4">Informações de Contato</h4>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Mail className="w-5 h-5 mt-0.5 text-gray-500" />
              <div>
                <p className="text-sm font-medium">Email Principal</p>
                <p className="text-sm text-gray-600">{client.email}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Building className="w-5 h-5 mt-0.5 text-gray-500" />
              <div>
                <p className="text-sm font-medium">Empresa</p>
                <p className="text-sm text-gray-600">{client.company}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <User className="w-5 h-5 mt-0.5 text-gray-500" />
              <div>
                <p className="text-sm font-medium">Setor</p>
                <p className="text-sm text-gray-600">{client.sector}</p>
              </div>
            </div>
          </div>
        </div>
        <div>
          <h4 className="text-base font-semibold mb-4">Informações do Produto</h4>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div>
                <p className="text-sm font-medium">Produto</p>
                <p className="text-sm text-gray-600">{client.product_name || 'Não informado'}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div>
                <p className="text-sm font-medium">Tom de Voz</p>
                <p className="text-sm text-gray-600">{client.voice_tone || 'Não informado'}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div>
                <p className="text-sm font-medium">Orçamento Mensal</p>
                <p className="text-sm text-gray-600">
                  {client.monthly_budget ? `R$ ${client.monthly_budget.toFixed(2)}` : 'Não informado'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
