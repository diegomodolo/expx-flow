import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldOff, RefreshCw, UserX, Unlock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BlockedContact {
  jid: string;
  phone: string;
  formatted_phone: string;
}

interface WhatsAppBlockedContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string | undefined;
  instanceId: string | null;
}

export function WhatsAppBlockedContactsModal({
  isOpen,
  onClose,
  companyId,
  instanceId,
}: WhatsAppBlockedContactsModalProps) {
  const [blockedContacts, setBlockedContacts] = useState<BlockedContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unblockingPhone, setUnblockingPhone] = useState<string | null>(null);

  const fetchBlockedContacts = async () => {
    if (!companyId || !instanceId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-whatsapp-blocklist", {
        body: {
          company_id: companyId,
          instance_id: instanceId,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setBlockedContacts(data.blockList || []);
      } else {
        throw new Error(data?.error || "Erro ao buscar contatos bloqueados");
      }
    } catch (err: any) {
      console.error("[WhatsAppBlockedContactsModal] Error:", err);
      toast.error(err.message || "Erro ao buscar contatos bloqueados");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblockContact = async (contact: BlockedContact) => {
    if (!companyId || !instanceId) return;

    setUnblockingPhone(contact.phone);
    try {
      const { data, error } = await supabase.functions.invoke("block-whatsapp-contact", {
        body: {
          company_id: companyId,
          instance_id: instanceId,
          phone: contact.phone,
          block: false,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Contato desbloqueado com sucesso");
        // Remove from local list
        setBlockedContacts((prev) => prev.filter((c) => c.phone !== contact.phone));
      } else {
        throw new Error(data?.error || "Erro ao desbloquear contato");
      }
    } catch (err: any) {
      console.error("[WhatsAppBlockedContactsModal] Unblock error:", err);
      toast.error(err.message || "Erro ao desbloquear contato");
    } finally {
      setUnblockingPhone(null);
    }
  };

  useEffect(() => {
    if (isOpen && companyId && instanceId) {
      fetchBlockedContacts();
    }
  }, [isOpen, companyId, instanceId]);

  const getInitials = (phone: string): string => {
    const digits = phone.replace(/\D/g, "");
    return digits.slice(-2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-destructive" />
            <DialogTitle>Contatos Bloqueados</DialogTitle>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={fetchBlockedContacts}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Carregando contatos bloqueados...</p>
          </div>
        ) : blockedContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <UserX className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhum contato bloqueado</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 pr-4">
              {blockedContacts.map((contact) => (
                <div
                  key={contact.jid}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-destructive/10 text-destructive text-sm">
                      {getInitials(contact.phone)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{contact.formatted_phone}</p>
                    <p className="text-xs text-muted-foreground truncate">+{contact.phone}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnblockContact(contact)}
                    disabled={unblockingPhone === contact.phone}
                    className="text-primary hover:text-primary"
                  >
                    {unblockingPhone === contact.phone ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Unlock className="h-4 w-4 mr-1" />
                        Desbloquear
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground text-center">
            {blockedContacts.length} contato{blockedContacts.length !== 1 ? "s" : ""} bloqueado{blockedContacts.length !== 1 ? "s" : ""}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
