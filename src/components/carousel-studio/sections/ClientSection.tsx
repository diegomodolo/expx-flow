import React, { useState } from "react";
import { useClients } from "@/hooks/useClients";
import { Check, ChevronsUpDown, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  clientId: string | null;
  onChange: (clientId: string | null) => void;
}

export function ClientSection({ clientId, onChange }: Props) {
  const { clients, loading } = useClients();
  const [open, setOpen] = useState(false);

  const selected = clients.find((c) => c.id === clientId) ?? null;

  return (
    <div className="px-4 py-3 border-b border-border">
      <div className="flex items-center gap-2 mb-2">
        <User className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Cliente
        </span>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-sm h-9"
            disabled={loading}
          >
            <span className="truncate">
              {selected ? selected.name : "Selecionar cliente..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar cliente..." />
            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
            <CommandGroup className="max-h-56 overflow-y-auto">
              {clientId && (
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="text-muted-foreground text-xs"
                >
                  Remover seleção
                </CommandItem>
              )}
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.name}
                  onSelect={() => {
                    onChange(client.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      clientId === client.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{client.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {selected && (
        <div className="mt-2 text-xs text-muted-foreground truncate">
          {selected.company && (
            <span className="font-medium text-foreground">
              {selected.company}
            </span>
          )}
          {selected.instagram_account?.username && (
            <span className="ml-1">
              · @{selected.instagram_account.username}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
