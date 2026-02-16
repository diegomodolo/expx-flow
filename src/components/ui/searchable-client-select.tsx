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

export interface ClientOption {
  id: string;
  name: string;
  extra?: string; // optional secondary text (e.g. company name)
}

interface SearchableClientSelectProps {
  clients: ClientOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  /** Text shown for the "all" option. If provided, an "all" option is rendered. */
  allLabel?: string;
  /** Text shown for the "none" option. If provided, a "none/empty" option is rendered. */
  noneLabel?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export function SearchableClientSelect({
  clients,
  value,
  onValueChange,
  placeholder = 'Selecione um cliente',
  allLabel,
  noneLabel,
  className,
  triggerClassName,
  disabled = false,
}: SearchableClientSelectProps) {
  const [open, setOpen] = useState(false);

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    );
  }, [clients]);

  const selectedClient = clients.find((c) => c.id === value);

  const displayText = (() => {
    if (allLabel && value === 'all') return allLabel;
    if (noneLabel && (value === '' || value === 'none')) return noneLabel;
    if (selectedClient) return selectedClient.name;
    return placeholder;
  })();

  const hasValue = allLabel
    ? value !== 'all' && !!value
    : !!value && value !== '' && value !== 'none';

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full justify-between font-normal',
              !hasValue && !allLabel && !noneLabel && 'text-muted-foreground',
              triggerClassName
            )}
          >
            <span className="truncate">{displayText}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0 bg-popover border z-[9999]"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Buscar cliente..." />
            <CommandList>
              <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
              <CommandGroup>
                {allLabel && (
                  <CommandItem
                    value="__all__"
                    onSelect={() => {
                      onValueChange('all');
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === 'all' ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {allLabel}
                  </CommandItem>
                )}
                {noneLabel && (
                  <CommandItem
                    value="__none__"
                    onSelect={() => {
                      onValueChange(allLabel ? '' : 'none');
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === '' || value === 'none' ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {noneLabel}
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
                        'mr-2 h-4 w-4',
                        value === client.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span>{client.name}</span>
                    {client.extra && (
                      <span className="ml-1 text-muted-foreground text-xs">
                        ({client.extra})
                      </span>
                    )}
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
