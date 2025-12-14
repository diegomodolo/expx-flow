import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
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
}

interface ClientComboboxProps {
  clients: Client[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export const ClientCombobox: React.FC<ClientComboboxProps> = ({
  clients,
  value,
  onValueChange,
  placeholder = "Selecione um cliente",
}) => {
  const [open, setOpen] = useState(false);

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [clients]);

  const selectedClient = clients.find(c => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedClient ? selectedClient.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar cliente..." />
          <CommandList>
            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="none"
                onSelect={() => {
                  onValueChange('');
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !value ? "opacity-100" : "opacity-0"
                  )}
                />
                Nenhum
              </CommandItem>
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
                  {client.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
