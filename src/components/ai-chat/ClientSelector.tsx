import React, { useState } from "react";
import { useClients } from "@/hooks/useClients";
import { Users, Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ClientSelectorProps {
  selectedClientId: string;
  onClientSelect: (clientId: string) => void;
  companyId?: string;
}

export function ClientSelector({ selectedClientId, onClientSelect, companyId }: ClientSelectorProps) {
  const [open, setOpen] = useState(false);
  const { clients, loading } = useClients();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Users className="w-4 h-4" />
        <span>Carregando clientes...</span>
      </div>
    );
  }

  // Sort clients alphabetically by name
  const sortedClients = [...clients].sort((a, b) => 
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
  );

  const selectedClient = sortedClients.find(client => client.id === selectedClientId);

  return (
    <div className="flex items-center gap-2">
      <Users className="w-4 h-4 text-muted-foreground" />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedClient ? (
              <div className="flex items-center gap-2">
                <span className="font-medium">{selectedClient.name}</span>
                <span className="text-muted-foreground text-sm">({selectedClient.company})</span>
              </div>
            ) : (
              "Selecione um cliente para conversar com a IA"
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0 bg-popover border" align="start">
          <Command>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput 
                placeholder="Pesquisar cliente..." 
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <CommandList>
              <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
              <CommandGroup>
                {sortedClients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={`${client.name} ${client.company}`}
                    onSelect={() => {
                      onClientSelect(client.id === selectedClientId ? "" : client.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedClientId === client.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{client.name}</span>
                      <span className="text-muted-foreground text-sm">({client.company})</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}