import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
  company?: string;
}

interface ClientSearchComboboxProps {
  clients: Client[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  showCompany?: boolean;
  includeAllOption?: boolean;
  allOptionLabel?: string;
  className?: string;
}

export const ClientSearchCombobox: React.FC<ClientSearchComboboxProps> = ({
  clients,
  value,
  onValueChange,
  placeholder = "Selecione um cliente...",
  showCompany = false,
  includeAllOption = false,
  allOptionLabel = "Todos os clientes",
  className,
}) => {
  const [open, setOpen] = useState(false);

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [clients]);

  const selectedClient = clients.find(c => c.id === value);

  const getDisplayLabel = () => {
    if (includeAllOption && (value === "all" || !value)) {
      return allOptionLabel;
    }
    if (selectedClient) {
      return showCompany && selectedClient.company 
        ? `${selectedClient.name} - ${selectedClient.company}`
        : selectedClient.name;
    }
    return placeholder;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          <span className="truncate">{getDisplayLabel()}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover" align="start">
        <Command>
          <CommandInput placeholder="Buscar cliente..." />
          <CommandList>
            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
            <CommandGroup>
              {includeAllOption && (
                <CommandItem
                  value="__all__"
                  onSelect={() => {
                    onValueChange("all");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === "all" || !value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {allOptionLabel}
                </CommandItem>
              )}
              {sortedClients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.name}
                  onSelect={() => {
                    onValueChange(client.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {showCompany && client.company 
                    ? `${client.name} - ${client.company}`
                    : client.name
                  }
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
