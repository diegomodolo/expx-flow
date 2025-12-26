import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, User, Mail, Phone, Building, Check } from "lucide-react";
import { useCRMContacts, CRMContact } from "@/hooks/useCRMContacts";
import { cn } from "@/lib/utils";

interface CRMContactSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onSelectContact: (contact: CRMContact) => void;
  currentContactId?: string;
}

export function CRMContactSearchModal({
  isOpen,
  onClose,
  workspaceId,
  onSelectContact,
  currentContactId,
}: CRMContactSearchModalProps) {
  const [search, setSearch] = useState("");
  const { contacts, isLoading } = useCRMContacts(workspaceId);

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    
    const searchLower = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.full_name?.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower) ||
        c.phone?.includes(search) ||
        c.company_name?.toLowerCase().includes(searchLower)
    );
  }, [contacts, search]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSelect = (contact: CRMContact) => {
    onSelectContact(contact);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Buscar Lead/Contato</DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome, email, telefone ou empresa..."
            className="pl-10"
            autoFocus
          />
        </div>

        {/* Results */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando contatos...
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "Nenhum contato encontrado" : "Nenhum contato cadastrado"}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContacts.map((contact) => {
                const isSelected = contact.id === currentContactId;
                
                return (
                  <button
                    key={contact.id}
                    onClick={() => handleSelect(contact)}
                    className={cn(
                      "w-full flex items-center gap-4 p-3 rounded-lg border text-left transition-colors",
                      isSelected
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted border-border"
                    )}
                  >
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        {getInitials(contact.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{contact.full_name}</span>
                        {isSelected && (
                          <Badge variant="default" className="shrink-0">
                            <Check className="w-3 h-3 mr-1" />
                            Atual
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                        {contact.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3" />
                            {contact.email}
                          </span>
                        )}
                        {contact.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {contact.phone}
                          </span>
                        )}
                        {contact.company_name && (
                          <span className="flex items-center gap-1 truncate">
                            <Building className="w-3 h-3" />
                            {contact.company_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <span className="text-sm text-muted-foreground">
            {filteredContacts.length} contato(s) encontrado(s)
          </span>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
