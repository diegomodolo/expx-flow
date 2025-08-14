import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClients } from "@/hooks/useClients";
import { Users } from "lucide-react";

interface ClientSelectorProps {
  selectedClientId: string;
  onClientSelect: (clientId: string) => void;
  companyId?: string;
}

export function ClientSelector({ selectedClientId, onClientSelect, companyId }: ClientSelectorProps) {
  const { clients, loading } = useClients();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Users className="w-4 h-4" />
        <span>Carregando clientes...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Users className="w-4 h-4 text-muted-foreground" />
      <Select value={selectedClientId} onValueChange={onClientSelect}>
        <SelectTrigger className="w-80">
          <SelectValue placeholder="Selecione um cliente para conversar com a IA" />
        </SelectTrigger>
        <SelectContent>
          {clients.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{client.name}</span>
                <span className="text-muted-foreground text-sm">({client.company})</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}