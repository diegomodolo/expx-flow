import React, { useState } from "react";
import { useClients, Client } from "@/hooks/useClients";
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
import { StudioProject, StudioSlide } from "../types";

export interface ClientDefaults {
  projectPatch: Partial<StudioProject>;
  slidePatch: Partial<StudioSlide>;
}

/** Extrai configurações automáticas do cliente para o carrossel */
function extractClientDefaults(client: Client): ClientDefaults {
  const projectPatch: Partial<StudioProject> = {};
  const slidePatch: Partial<StudioSlide> = {};

  // Instagram handle
  if (client.instagram_account?.username) {
    projectPatch.instagram_handle = client.instagram_account.username;
  }

  // Cor de destaque: usa a cor da equipe se disponível
  if (client.team?.color) {
    projectPatch.accent_color = client.team.color;
  }

  // Badge: foto de perfil do Instagram ou avatar
  const badgeUrl =
    client.instagram_account?.profile_picture_url || client.avatar || null;
  if (badgeUrl) {
    slidePatch.badge_enabled = true;
    slidePatch.badge_photo_url = badgeUrl;
  }

  return { projectPatch, slidePatch };
}

interface Props {
  clientId: string | null;
  onChange: (clientId: string | null, defaults: ClientDefaults | null) => void;
}

export function ClientSection({ clientId, onChange }: Props) {
  const { clients, loading } = useClients();
  const [open, setOpen] = useState(false);

  const selected = clients.find((c) => c.id === clientId) ?? null;

  const handleSelect = (client: Client) => {
    const defaults = extractClientDefaults(client);
    onChange(client.id, defaults);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null, null);
    setOpen(false);
  };

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
                  onSelect={handleClear}
                  className="text-muted-foreground text-xs"
                >
                  Remover seleção
                </CommandItem>
              )}
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.name}
                  onSelect={() => handleSelect(client)}
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

      {/* Preview do cliente selecionado */}
      {selected && (
        <div className="mt-2 flex items-center gap-2">
          {(selected.instagram_account?.profile_picture_url ||
            selected.avatar) && (
            <img
              src={
                selected.instagram_account?.profile_picture_url ||
                selected.avatar
              }
              className="w-7 h-7 rounded-full object-cover shrink-0"
              alt=""
            />
          )}
          <div className="min-w-0">
            <div className="text-xs font-medium text-foreground truncate">
              {selected.name}
            </div>
            {selected.instagram_account?.username && (
              <div className="text-xs text-muted-foreground truncate">
                @{selected.instagram_account.username}
              </div>
            )}
          </div>
          {selected.team?.color && (
            <div
              className="w-3 h-3 rounded-full shrink-0 ml-auto"
              style={{ backgroundColor: selected.team.color }}
              title={`Cor da equipe: ${selected.team.color}`}
            />
          )}
        </div>
      )}
    </div>
  );
}
