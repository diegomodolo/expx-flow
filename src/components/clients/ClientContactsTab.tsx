import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Phone, Mail, Users, Loader2 } from "lucide-react";
import { useClientContacts, ClientContact } from "@/hooks/useClientContacts";
import { useCompany } from "@/contexts/CompanyContext";

interface ClientContactsTabProps {
  clientId: string | undefined;
  readOnly?: boolean;
}

export function ClientContactsTab({ clientId, readOnly = false }: ClientContactsTabProps) {
  const { activeCompany } = useCompany();
  const { 
    contacts, 
    isLoading, 
    createContact, 
    isCreating,
    updateContact,
    isUpdating,
    deleteContact 
  } = useClientContacts(activeCompany?.id, clientId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    } else if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const handleOpenModal = (contact?: ClientContact) => {
    if (contact) {
      setEditingContact(contact);
      setContactName(contact.contact_name);
      setContactPhone(contact.phone);
      setContactEmail(contact.email || "");
    } else {
      setEditingContact(null);
      setContactName("");
      setContactPhone("");
      setContactEmail("");
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingContact(null);
    setContactName("");
    setContactPhone("");
    setContactEmail("");
  };

  const handleSave = () => {
    if (!clientId) return;

    if (editingContact) {
      updateContact({
        id: editingContact.id,
        contactName,
        phone: contactPhone.replace(/\D/g, ''),
        email: contactEmail || undefined,
      });
    } else {
      createContact({
        clientId,
        contactName,
        phone: contactPhone.replace(/\D/g, ''),
        email: contactEmail || undefined,
      });
    }
    handleCloseModal();
  };

  const handleDelete = () => {
    if (deleteContactId) {
      deleteContact(deleteContactId);
      setDeleteContactId(null);
    }
  };

  if (!clientId) {
    return (
      <div className="text-center py-8">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Salve o cliente primeiro para adicionar contatos</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Contatos do Cliente</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os contatos deste cliente para notificações WhatsApp
          </p>
        </div>
        {!readOnly && (
          <Button onClick={() => handleOpenModal()} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Contato
          </Button>
        )}
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-2">Nenhum contato cadastrado</p>
          {!readOnly && (
            <Button onClick={() => handleOpenModal()} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Contato
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div>
                <span className="font-medium">{contact.contact_name}</span>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {formatPhone(contact.phone)}
                  </span>
                  {contact.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {contact.email}
                    </span>
                  )}
                </div>
              </div>
              {!readOnly && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenModal(contact)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteContactId(contact.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Editar Contato' : 'Novo Contato'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Contato *</Label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Ex: João Silva"
              />
            </div>

            <div className="space-y-2">
              <Label>Telefone (WhatsApp) *</Label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Ex: 5511999999999"
              />
              <p className="text-xs text-muted-foreground">
                Formato: código do país + DDD + número
              </p>
            </div>

            <div className="space-y-2">
              <Label>E-mail (opcional)</Label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="Ex: joao@empresa.com"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isCreating || isUpdating || !contactName || !contactPhone}
            >
              {(isCreating || isUpdating) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingContact ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteContactId} onOpenChange={() => setDeleteContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Contato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este contato? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
