import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Link2, Link2Off, Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useClients, Client } from "@/hooks/useClients";
import { useQueryClient } from "@tanstack/react-query";

interface WhatsAppClientLinkerProps {
  conversationId: string;
  currentClientId: string | null;
  companyId: string | undefined;
  conversationPhone?: string; // Phone number from the conversation
  conversationContactName?: string | null; // Contact name from the conversation
  onClientChange?: (clientId: string | null, clientName: string | null, clientLogoUrl?: string | null) => void;
  variant?: "badge" | "button" | "compact";
}

export function WhatsAppClientLinker({
  conversationId,
  currentClientId,
  companyId,
  conversationPhone,
  conversationContactName,
  onClientChange,
  variant = "button",
}: WhatsAppClientLinkerProps) {
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(currentClientId);
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null);
  
  const { clients, loading: isLoadingClients } = useClients();
  const queryClient = useQueryClient();

  // Update local state when prop changes
  useEffect(() => {
    setSelectedClientId(currentClientId);
    if (currentClientId && clients.length > 0) {
      const client = clients.find((c) => c.id === currentClientId);
      setSelectedClientName(client?.name || null);
    } else {
      setSelectedClientName(null);
    }
  }, [currentClientId, clients]);

  const handleSelect = async (clientId: string | null, conversationPhone?: string, conversationContactName?: string) => {
    if (clientId === selectedClientId) {
      setOpen(false);
      return;
    }

    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from("whatsapp_conversations")
        .update({ client_id: clientId })
        .eq("id", conversationId);

      if (error) throw error;

      const selectedClient = clientId 
        ? clients.find((c) => c.id === clientId) 
        : null;
      const clientName = selectedClient?.name || null;
      const clientLogoUrl = selectedClient?.avatar || null;

      setSelectedClientId(clientId);
      setSelectedClientName(clientName);
      onClientChange?.(clientId, clientName, clientLogoUrl);

      // Immediately invalidate conversations query to refresh the list with the new client data
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });

      // If linking to a client, also create a contact record if it doesn't exist
      if (clientId && conversationPhone) {
        await syncContactToClient(clientId, conversationPhone, conversationContactName || conversationPhone);
      }

      if (clientId) {
        toast.success(`Contato vinculado a ${clientName}`);
      } else {
        toast.success("Contato desvinculado do cliente");
      }
    } catch (err: any) {
      console.error("[WhatsAppClientLinker] Error updating client:", err);
      toast.error("Erro ao atualizar vinculação");
    } finally {
      setIsUpdating(false);
      setOpen(false);
    }
  };

  // Sync the WhatsApp contact to the client's contact list
  const syncContactToClient = async (clientId: string, phone: string, contactName: string) => {
    if (!companyId) return;

    try {
      // Check if contact already exists for this client with this phone
      const { data: existingContacts } = await supabase
        .from("whatsapp_client_contacts")
        .select("id")
        .eq("company_id", companyId)
        .eq("client_id", clientId)
        .eq("phone", phone)
        .limit(1);

      if (existingContacts && existingContacts.length > 0) {
        // Contact already exists, no need to create
        return;
      }

      // Create new contact
      await supabase
        .from("whatsapp_client_contacts")
        .insert({
          company_id: companyId,
          client_id: clientId,
          contact_name: contactName,
          phone: phone,
          is_active: true,
        });
    } catch (err) {
      console.error("[WhatsAppClientLinker] Error syncing contact:", err);
      // Don't show error to user, this is a background sync
    }
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  // Compact variant - just show badge with client name
  if (variant === "compact") {
    if (!selectedClient) {
      return (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              disabled={isUpdating}
            >
              <Link2Off className="h-3 w-3" />
              <span>Sem cliente</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-0" align="start">
            <ClientSelector
              clients={clients}
              isLoading={isLoadingClients}
              selectedClientId={selectedClientId}
              onSelect={(clientId) => handleSelect(clientId, conversationPhone, conversationContactName)}
            />
          </PopoverContent>
        </Popover>
      );
    }

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Badge 
            variant="secondary" 
            className="cursor-pointer hover:bg-secondary/80 gap-1 text-xs font-normal"
          >
            <Building2 className="h-3 w-3" />
            {selectedClient.name}
          </Badge>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0" align="start">
          <ClientSelector
            clients={clients}
            isLoading={isLoadingClients}
            selectedClientId={selectedClientId}
            onSelect={(clientId) => handleSelect(clientId, conversationPhone, conversationContactName)}
          />
        </PopoverContent>
      </Popover>
    );
  }

  // Badge variant - inline display
  if (variant === "badge") {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {selectedClient ? (
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-accent gap-1.5 py-1"
            >
              <Building2 className="h-3.5 w-3.5" />
              {selectedClient.name}
              {isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
            </Badge>
          ) : (
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-accent gap-1.5 py-1 text-muted-foreground"
            >
              <Link2Off className="h-3.5 w-3.5" />
              Vincular cliente
              {isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
            </Badge>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <ClientSelector
            clients={clients}
            isLoading={isLoadingClients}
            selectedClientId={selectedClientId}
            onSelect={(clientId) => handleSelect(clientId, conversationPhone, conversationContactName)}
          />
        </PopoverContent>
      </Popover>
    );
  }

  // Button variant (default)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant={selectedClient ? "secondary" : "ghost"}
              size="icon"
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : selectedClient ? (
                <Link2 className="h-4 w-4 text-primary" />
              ) : (
                <Link2Off className="h-4 w-4" />
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {selectedClient 
            ? `Vinculado: ${selectedClient.name}` 
            : "Vincular a cliente"}
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-[280px] p-0" align="end">
        <ClientSelector
          clients={clients}
          isLoading={isLoadingClients}
          selectedClientId={selectedClientId}
          onSelect={(clientId) => handleSelect(clientId, conversationPhone, conversationContactName)}
        />
      </PopoverContent>
    </Popover>
  );
}

// Internal component for client selection
function ClientSelector({
  clients,
  isLoading,
  selectedClientId,
  onSelect,
}: {
  clients: Client[];
  isLoading: boolean;
  selectedClientId: string | null;
  onSelect: (clientId: string | null) => void;
}) {
  return (
    <Command>
      <CommandInput placeholder="Buscar cliente..." />
      <CommandList>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
            <CommandGroup>
              {/* Option to unlink */}
              <CommandItem
                value="_unlink_"
                onSelect={() => onSelect(null)}
                className={cn(
                  "flex items-center gap-2",
                  !selectedClientId && "bg-accent"
                )}
              >
                <Link2Off className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Sem vinculação</span>
                {!selectedClientId && <Check className="ml-auto h-4 w-4" />}
              </CommandItem>

              {/* Client list */}
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.name}
                  onSelect={() => onSelect(client.id)}
                  className={cn(
                    "flex items-center gap-2",
                    selectedClientId === client.id && "bg-accent"
                  )}
                >
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="font-medium">{client.name}</span>
                    {client.company && (
                      <span className="text-xs text-muted-foreground">{client.company}</span>
                    )}
                  </div>
                  {selectedClientId === client.id && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </Command>
  );
}
