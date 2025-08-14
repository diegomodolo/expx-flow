import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientSelector } from "@/components/ai-chat/ClientSelector";
import { useCompany } from "@/contexts/CompanyContext";
import { Users } from "lucide-react";

interface ClientStepProps {
  selectedClientId: string;
  onClientSelect: (clientId: string) => void;
}

export function ClientStep({ selectedClientId, onClientSelect }: ClientStepProps) {
  const { activeCompany } = useCompany();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Selecione o Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Escolha o cliente para quem você deseja gerar conteúdo. O sistema utilizará 
            as informações do briefing e histórico do cliente para personalizar o conteúdo.
          </p>
          
          {activeCompany ? (
            <ClientSelector
              selectedClientId={selectedClientId}
              onClientSelect={onClientSelect}
              companyId={activeCompany.company_id}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Carregando dados da empresa...
            </div>
          )}
        </CardContent>
      </Card>

      {selectedClientId && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-primary font-medium">
              <Check className="w-4 h-4" />
              Cliente selecionado com sucesso!
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Continue para escolher o tema do conteúdo.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polyline points="20,6 9,17 4,12" />
    </svg>
  );
}