import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Pencil, Trash2, Users, Phone, Loader2, Search } from "lucide-react";
import { ClientContact } from "@/hooks/useWhatsAppNotifications";
import { useClients } from "@/hooks/useClients";

interface ClientContactsManagerProps {
  contacts: ClientContact[];
  onCreateContact: (contact: Partial<ClientContact>) => void;
  isCreating: boolean;
  onUpdateContact: (contact: Partial<ClientContact> & { id: string }) => void;
  onDeleteContact: (contactId: string) => void;
}

const PROFILE_TYPES = [
  { value: 'gestor', label: 'Gestor', icon: '👤', color: 'bg-blue-500' },
  { value: 'cliente', label: 'Cliente', icon: '🏢', color: 'bg-green-500' },
  { value: 'financeiro', label: 'Financeiro', icon: '💰', color: 'bg-yellow-500' },
];

export function ClientContactsManager({
  contacts,
  onCreateContact,
  isCreating,
  onUpdateContact,
  onDeleteContact,
}: ClientContactsManagerProps) {
  const { clients } = useClients();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Form state
  const [clientId, setClientId] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileType, setProfileType] = useState<ClientContact['profile_type']>("gestor");
  const [receivesAlerts, setReceivesAlerts] = useState(true);
  const [receivesReports, setReceivesReports] = useState(true);

  const resetForm = () => {
    setClientId("");
    setContactName("");
    setPhone("");
    setProfileType("gestor");
    setReceivesAlerts(true);
    setReceivesReports(true);
    setEditingContact(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contact: ClientContact) => {
    setEditingContact(contact);
    setClientId(contact.client_id);
    setContactName(contact.contact_name);
    setPhone(contact.phone);
    setProfileType(contact.profile_type);
    setReceivesAlerts(contact.receives_alerts);
    setReceivesReports(contact.receives_reports);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingContact) {
      onUpdateContact({
        id: editingContact.id,
        contact_name: contactName,
        phone: phone.replace(/\D/g, ''),
        profile_type: profileType,
        receives_alerts: receivesAlerts,
        receives_reports: receivesReports,
      });
    } else {
      onCreateContact({
        client_id: clientId,
        contact_name: contactName,
        phone: phone.replace(/\D/g, ''),
        profile_type: profileType,
        receives_alerts: receivesAlerts,
        receives_reports: receivesReports,
      });
    }
    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = () => {
    if (deleteContactId) {
      onDeleteContact(deleteContactId);
      setDeleteContactId(null);
    }
  };

  // Format phone for display
  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    } else if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  // Group contacts by client
  const contactsByClient = contacts.reduce((acc, contact) => {
    const clientName = contact.client?.name || 'Cliente desconhecido';
    if (!acc[clientName]) {
      acc[clientName] = [];
    }
    acc[clientName].push(contact);
    return acc;
  }, {} as Record<string, ClientContact[]>);

  // Filter contacts by search
  const filteredClients = Object.entries(contactsByClient).filter(([clientName]) =>
    clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Contatos por Cliente
          </CardTitle>
          <Button onClick={handleOpenCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Novo Contato
          </Button>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {contacts.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum contato cadastrado</p>
              <p className="text-sm text-muted-foreground mb-4">
                Adicione contatos para receber notificações via WhatsApp
              </p>
              <Button onClick={handleOpenCreate} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeiro Contato
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClients.map(([clientName, clientContacts]) => (
                <div key={clientName} className="border rounded-lg">
                  <div className="p-3 bg-muted/50 border-b">
                    <span className="font-medium">{clientName}</span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {clientContacts.length} contato{clientContacts.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="divide-y">
                    {clientContacts.map((contact) => {
                      const profile = PROFILE_TYPES.find(p => p.value === contact.profile_type);
                      return (
                        <div key={contact.id} className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{profile?.icon || '👤'}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{contact.contact_name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {profile?.label || contact.profile_type}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {formatPhone(contact.phone)}
                              </div>
                              <div className="flex gap-2 mt-1">
                                {contact.receives_alerts && (
                                  <Badge variant="secondary" className="text-xs">Alertas</Badge>
                                )}
                                {contact.receives_reports && (
                                  <Badge variant="secondary" className="text-xs">Relatórios</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(contact)}>
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Editar Contato' : 'Novo Contato'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!editingContact && (
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Nome do Contato</Label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Ex: João Silva"
              />
            </div>

            <div className="space-y-2">
              <Label>Telefone (WhatsApp)</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 5511999999999"
              />
              <p className="text-xs text-muted-foreground">
                Formato: código do país + DDD + número (sem espaços ou símbolos)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={profileType} onValueChange={(v) => setProfileType(v as ClientContact['profile_type'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROFILE_TYPES.map((profile) => (
                    <SelectItem key={profile.value} value={profile.value}>
                      <div className="flex items-center gap-2">
                        <span>{profile.icon}</span>
                        <span>{profile.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Receber Alertas</Label>
                  <p className="text-xs text-muted-foreground">CPA alto, saldo baixo, etc.</p>
                </div>
                <Switch checked={receivesAlerts} onCheckedChange={setReceivesAlerts} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Receber Relatórios</Label>
                  <p className="text-xs text-muted-foreground">Relatórios semanais/mensais</p>
                </div>
                <Switch checked={receivesReports} onCheckedChange={setReceivesReports} />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isCreating || !contactName || !phone || (!editingContact && !clientId)}
            >
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
              Tem certeza que deseja excluir este contato? Ele não receberá mais notificações.
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
    </>
  );
}
