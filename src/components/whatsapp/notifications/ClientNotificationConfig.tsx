import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Phone,
  Loader2,
  Search,
  Check,
  ChevronsUpDown,
  ChevronDown,
  ChevronRight,
  UserCog,
  Mail,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useClients } from "@/hooks/useClients";
import { useEmployees } from "@/hooks/useEmployees";
import { useClientNotificationSettings, ClientNotificationSettings, ClientContact, TriggerSubscription } from "@/hooks/useClientNotificationSettings";
import { useClientContacts } from "@/hooks/useClientContacts";
import { NotificationTrigger } from "@/hooks/useWhatsAppNotifications";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ClientNotificationConfigProps {
  companyId: string | undefined;
  triggers: NotificationTrigger[];
}

const DESTINATION_OPTIONS = [
  { value: 'gestor', label: 'Apenas Gestor', icon: '👤' },
  { value: 'cliente', label: 'Apenas Contatos do Cliente', icon: '🏢' },
  { value: 'ambos', label: 'Gestor e Contatos', icon: '👥' },
];

export function ClientNotificationConfig({ companyId, triggers }: ClientNotificationConfigProps) {
  const { clients } = useClients();
  const { employees } = useEmployees();
  const {
    clientSettings,
    isLoadingSettings,
    fetchSubscriptions,
    fetchClientContacts,
    createSettings,
    isCreatingSettings,
    updateSettings,
    deleteSettings,
    upsertSubscription,
    createContact,
    createContactAsync,
    isCreatingContact,
    updateContact,
    updateContactAsync,
    deleteContact,
  } = useClientNotificationSettings(companyId);

  const [searchTerm, setSearchTerm] = useState("");
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  
  // Add client modal
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedGestorId, setSelectedGestorId] = useState("");
  const [clientComboOpen, setClientComboOpen] = useState(false);

  // Edit settings modal
  const [editingSettings, setEditingSettings] = useState<ClientNotificationSettings | null>(null);
  const [editGestorId, setEditGestorId] = useState("");

  // Contact modal
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactClientId, setContactClientId] = useState("");
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const [contactMode, setContactMode] = useState<'select' | 'create'>('select');
  const [selectedExistingContactId, setSelectedExistingContactId] = useState("");
  const [existingContactsOpen, setExistingContactsOpen] = useState(false);
  const [existingContactsForClient, setExistingContactsForClient] = useState<ClientContact[]>([]);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // Delete confirmations
  const [deleteSettingsId, setDeleteSettingsId] = useState<string | null>(null);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);

  // Client data cache (subscriptions and contacts)
  const [clientData, setClientData] = useState<Record<string, { 
    subscriptions: TriggerSubscription[]; 
    contacts: ClientContact[];
    loading: boolean;
  }>>({});

  // Sorted clients for combobox
  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })),
    [clients]
  );

  // Sorted employees for selection
  const sortedEmployees = useMemo(
    () => [...employees].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })),
    [employees]
  );

  // Filter out clients that already have settings
  const availableClients = useMemo(() => {
    const usedClientIds = new Set(clientSettings.map(s => s.client_id));
    return sortedClients.filter(c => !usedClientIds.has(c.id));
  }, [sortedClients, clientSettings]);

  // Filter settings by search
  const filteredSettings = clientSettings.filter(s =>
    s.client?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle expanded client
  const toggleClient = async (settingsId: string, clientId: string) => {
    const newExpanded = new Set(expandedClients);
    
    if (newExpanded.has(settingsId)) {
      newExpanded.delete(settingsId);
    } else {
      newExpanded.add(settingsId);
      
      // Load data if not already loaded
      if (!clientData[settingsId]) {
        setClientData(prev => ({
          ...prev,
          [settingsId]: { subscriptions: [], contacts: [], loading: true }
        }));

        try {
          const [subscriptions, contacts] = await Promise.all([
            fetchSubscriptions(settingsId),
            fetchClientContacts(clientId),
          ]);
          
          setClientData(prev => ({
            ...prev,
            [settingsId]: { subscriptions, contacts, loading: false }
          }));
        } catch (error) {
          console.error('Error loading client data:', error);
          setClientData(prev => ({
            ...prev,
            [settingsId]: { subscriptions: [], contacts: [], loading: false }
          }));
        }
      }
    }
    
    setExpandedClients(newExpanded);
  };

  // Handle add client
  const handleAddClient = () => {
    if (!selectedClientId) return;
    createSettings({ 
      clientId: selectedClientId, 
      gestorEmployeeId: selectedGestorId || undefined 
    });
    setIsAddClientModalOpen(false);
    setSelectedClientId("");
    setSelectedGestorId("");
  };

  // Handle update gestor
  const handleUpdateGestor = () => {
    if (!editingSettings) return;
    updateSettings({
      id: editingSettings.id,
      gestorEmployeeId: editGestorId || null,
    });
    setEditingSettings(null);
  };

  // Handle subscription change
  const handleSubscriptionChange = (
    settingsId: string,
    triggerId: string,
    destination: 'gestor' | 'cliente' | 'ambos',
    isActive: boolean
  ) => {
    upsertSubscription({
      clientSettingsId: settingsId,
      triggerId,
      destination,
      isActive,
    });

    // Update local state
    setClientData(prev => {
      const current = prev[settingsId];
      if (!current) return prev;

      const existingIndex = current.subscriptions.findIndex(
        s => s.trigger_id === triggerId
      );

      let newSubscriptions: TriggerSubscription[];
      if (existingIndex >= 0) {
        newSubscriptions = [...current.subscriptions];
        newSubscriptions[existingIndex] = {
          ...newSubscriptions[existingIndex],
          destination,
          is_active: isActive,
        };
      } else {
        newSubscriptions = [
          ...current.subscriptions,
          {
            id: `temp-${Date.now()}`,
            client_settings_id: settingsId,
            trigger_id: triggerId,
            destination,
            is_active: isActive,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
      }

      return {
        ...prev,
        [settingsId]: { ...current, subscriptions: newSubscriptions },
      };
    });
  };

  // Handle add/edit contact
  const handleOpenContactModal = async (clientId: string, contact?: ClientContact) => {
    setContactClientId(clientId);
    
    if (contact) {
      // Editing existing contact
      setEditingContact(contact);
      setContactMode('create');
      setContactName(contact.contact_name);
      setContactPhone(contact.phone);
      setContactEmail(contact.email || "");
      setSelectedExistingContactId("");
      setExistingContactsForClient([]);
    } else {
      // Adding new - fetch existing contacts for selection
      setEditingContact(null);
      setContactMode('select');
      setContactName("");
      setContactPhone("");
      setContactEmail("");
      setSelectedExistingContactId("");
      
      // Fetch all contacts for this client to allow selection
      try {
        const contacts = await fetchClientContacts(clientId);
        setExistingContactsForClient(contacts);
        // If no contacts exist, default to create mode
        if (contacts.length === 0) {
          setContactMode('create');
        }
      } catch (error) {
        console.error('Error fetching contacts:', error);
        setExistingContactsForClient([]);
        setContactMode('create');
      }
    }
    setIsContactModalOpen(true);
  };

  const handleSaveContact = async () => {
    const settingsEntry = clientSettings.find(s => s.client_id === contactClientId);
    
    try {
      if (editingContact) {
        // Updating existing contact
        await updateContactAsync({
          id: editingContact.id,
          contactName,
          phone: contactPhone.replace(/\D/g, ''),
          email: contactEmail || undefined,
        });
      } else if (contactMode === 'select' && selectedExistingContactId) {
        // Selecting existing contact - it's already in the DB, just refresh
      } else {
        // Creating new contact
        await createContactAsync({
          clientId: contactClientId,
          contactName,
          phone: contactPhone.replace(/\D/g, ''),
          email: contactEmail || undefined,
        });
      }
      
      // Refresh local data after mutation completes
      if (settingsEntry) {
        const contacts = await fetchClientContacts(contactClientId);
        setClientData(prev => ({
          ...prev,
          [settingsEntry.id]: { ...prev[settingsEntry.id], contacts },
        }));
      }
    } catch (error) {
      console.error('Error saving contact:', error);
    }
    
    setIsContactModalOpen(false);
  };

  const handleDeleteContact = () => {
    if (deleteContactId) {
      deleteContact(deleteContactId);
      setDeleteContactId(null);
    }
  };

  const handleDeleteSettings = () => {
    if (deleteSettingsId) {
      deleteSettings(deleteSettingsId);
      setDeleteSettingsId(null);
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

  if (isLoadingSettings) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Configuração de Clientes
          </CardTitle>
          <Button onClick={() => setIsAddClientModalOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Cliente
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

          {clientSettings.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum cliente configurado</p>
              <p className="text-sm text-muted-foreground mb-4">
                Adicione clientes para configurar notificações WhatsApp
              </p>
              <Button onClick={() => setIsAddClientModalOpen(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeiro Cliente
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSettings.map((settings) => {
                const isExpanded = expandedClients.has(settings.id);
                const data = clientData[settings.id];
                const subscriptionCount = data?.subscriptions.filter(s => s.is_active).length || 0;
                const contactCount = data?.contacts.length || 0;

                return (
                  <Collapsible
                    key={settings.id}
                    open={isExpanded}
                    onOpenChange={() => toggleClient(settings.id, settings.client_id)}
                  >
                    <div className="border rounded-lg">
                      <CollapsibleTrigger asChild>
                        <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{settings.client?.name}</span>
                                {!settings.is_active && (
                                  <Badge variant="secondary">Inativo</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                {settings.gestor && (
                                  <span className="flex items-center gap-1">
                                    <UserCog className="h-3 w-3" />
                                    {settings.gestor.name}
                                  </span>
                                )}
                                {isExpanded && (
                                  <>
                                    <span className="flex items-center gap-1">
                                      <Bell className="h-3 w-3" />
                                      {subscriptionCount} relatório{subscriptionCount !== 1 ? 's' : ''}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      {contactCount} contato{contactCount !== 1 ? 's' : ''}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Switch
                              checked={settings.is_active}
                              onCheckedChange={(checked) => updateSettings({ id: settings.id, isActive: checked })}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSettings(settings);
                                setEditGestorId(settings.gestor_employee_id || "");
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteSettingsId(settings.id);
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t p-4 space-y-6">
                          {data?.loading ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <>
                              {/* Contacts Section */}
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-medium text-sm flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Contatos do Cliente
                                  </h4>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenContactModal(settings.client_id)}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Adicionar
                                  </Button>
                                </div>

                                {data?.contacts.length === 0 ? (
                                  <p className="text-sm text-muted-foreground text-center py-2">
                                    Nenhum contato cadastrado
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {data?.contacts.map((contact) => (
                                      <div
                                        key={contact.id}
                                        className="flex items-center justify-between p-2 rounded-md bg-muted/30"
                                      >
                                        <div>
                                          <span className="font-medium text-sm">{contact.contact_name}</span>
                                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
                                        <div className="flex items-center gap-1">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => handleOpenContactModal(settings.client_id, contact)}
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive hover:text-destructive"
                                            onClick={() => setDeleteContactId(contact.id)}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Reports/Triggers Subscription Section */}
                              <div>
                                <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                                  <Bell className="h-4 w-4" />
                                  Relatórios e Alertas
                                </h4>

                                {triggers.length === 0 ? (
                                  <p className="text-sm text-muted-foreground text-center py-2">
                                    Nenhum gatilho configurado
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {triggers.map((trigger) => {
                                      const subscription = data?.subscriptions.find(
                                        s => s.trigger_id === trigger.id
                                      );
                                      const isSubscribed = subscription?.is_active ?? false;
                                      const destination = subscription?.destination || 'ambos';

                                      return (
                                        <div
                                          key={trigger.id}
                                          className="flex items-center justify-between p-2 rounded-md bg-muted/30"
                                        >
                                          <div className="flex items-center gap-3">
                                            <Switch
                                              checked={isSubscribed}
                                              onCheckedChange={(checked) =>
                                                handleSubscriptionChange(settings.id, trigger.id, destination, checked)
                                              }
                                            />
                                            <div>
                                              <span className="font-medium text-sm">{trigger.trigger_name}</span>
                                              {trigger.description && (
                                                <p className="text-xs text-muted-foreground">
                                                  {trigger.description}
                                                </p>
                                              )}
                                            </div>
                                          </div>

                                          {isSubscribed && (
                                            <Select
                                              value={destination}
                                              onValueChange={(value: 'gestor' | 'cliente' | 'ambos') =>
                                                handleSubscriptionChange(settings.id, trigger.id, value, true)
                                              }
                                            >
                                              <SelectTrigger className="w-48 h-8 text-xs">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {DESTINATION_OPTIONS.map((opt) => (
                                                  <SelectItem key={opt.value} value={opt.value}>
                                                    <div className="flex items-center gap-2">
                                                      <span>{opt.icon}</span>
                                                      <span>{opt.label}</span>
                                                    </div>
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Client Modal */}
      <Dialog open={isAddClientModalOpen} onOpenChange={setIsAddClientModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Cliente</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Popover open={clientComboOpen} onOpenChange={setClientComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientComboOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedClientId ? (
                      <span>{availableClients.find(c => c.id === selectedClientId)?.name}</span>
                    ) : (
                      <span className="text-muted-foreground">Selecione um cliente</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover z-[9999]" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar cliente..." />
                    <CommandList className="max-h-[200px]">
                      <CommandEmpty>Nenhum cliente disponível.</CommandEmpty>
                      <CommandGroup>
                        {availableClients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={`${client.name} ${client.company}`}
                            onSelect={() => {
                              setSelectedClientId(client.id);
                              setClientComboOpen(false);
                            }}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedClientId === client.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex items-center gap-2">
                              <span>{client.name}</span>
                              <span className="text-muted-foreground text-sm">({client.company})</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Gestor Responsável (Colaborador)</Label>
              <Select value={selectedGestorId || "__none__"} onValueChange={(v) => setSelectedGestorId(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um gestor (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {sortedEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                O gestor receberá notificações no WhatsApp cadastrado no colaborador
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsAddClientModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddClient} disabled={isCreatingSettings || !selectedClientId}>
              {isCreatingSettings && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Settings Modal */}
      <Dialog open={!!editingSettings} onOpenChange={() => setEditingSettings(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Configurações - {editingSettings?.client?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Gestor Responsável (Colaborador)</Label>
              <Select value={editGestorId || "__none__"} onValueChange={(v) => setEditGestorId(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um gestor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {sortedEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditingSettings(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateGestor}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Modal */}
      <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Editar Contato' : 'Adicionar Contato'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Mode selection - only show when not editing */}
            {!editingContact && existingContactsForClient.length > 0 && (
              <RadioGroup
                value={contactMode}
                onValueChange={(value: 'select' | 'create') => setContactMode(value)}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="select" id="select-existing" />
                  <Label htmlFor="select-existing" className="cursor-pointer">
                    Selecionar contato existente
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="create" id="create-new" />
                  <Label htmlFor="create-new" className="cursor-pointer">
                    Criar novo contato
                  </Label>
                </div>
              </RadioGroup>
            )}

            {/* Select existing contact */}
            {!editingContact && contactMode === 'select' && existingContactsForClient.length > 0 && (
              <div className="space-y-2">
                <Label>Selecionar Contato</Label>
                <Popover open={existingContactsOpen} onOpenChange={setExistingContactsOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={existingContactsOpen}
                      className="w-full justify-between font-normal"
                    >
                      {selectedExistingContactId ? (
                        <span>
                          {existingContactsForClient.find(c => c.id === selectedExistingContactId)?.contact_name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Selecione um contato</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover z-[9999]" align="start">
                    <Command>
                      <CommandInput placeholder="Pesquisar contato..." />
                      <CommandList className="max-h-[200px]">
                        <CommandEmpty>Nenhum contato encontrado.</CommandEmpty>
                        <CommandGroup>
                          {existingContactsForClient.map((contact) => (
                            <CommandItem
                              key={contact.id}
                              value={contact.contact_name}
                              onSelect={() => {
                                setSelectedExistingContactId(contact.id);
                                setExistingContactsOpen(false);
                              }}
                              className="cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedExistingContactId === contact.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{contact.contact_name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatPhone(contact.phone)}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Este contato já está cadastrado para o cliente
                </p>
              </div>
            )}

            {/* Create new contact form */}
            {(editingContact || contactMode === 'create' || existingContactsForClient.length === 0) && (
              <>
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
              </>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsContactModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveContact}
              disabled={
                isCreatingContact || 
                (contactMode === 'create' && (!contactName || !contactPhone)) ||
                (contactMode === 'select' && !selectedExistingContactId)
              }
            >
              {isCreatingContact && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingContact ? 'Salvar' : contactMode === 'select' ? 'Selecionar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Settings Confirmation */}
      <AlertDialog open={!!deleteSettingsId} onOpenChange={() => setDeleteSettingsId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este cliente? Todas as configurações de notificação serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSettings} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Contact Confirmation */}
      <AlertDialog open={!!deleteContactId} onOpenChange={() => setDeleteContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Contato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este contato?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContact} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
