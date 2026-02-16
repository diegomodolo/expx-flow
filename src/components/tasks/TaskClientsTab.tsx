import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Plus, X, User, Phone, Mail, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useTaskClients, useTaskClientContacts, TaskClient } from "@/hooks/useTaskClients";
import { useClientContacts } from "@/hooks/useClientContacts";
import { useClients } from "@/hooks/useClients";

interface TaskClientsTabProps {
  taskId: string | undefined;
  companyId: string | undefined;
  currentClientId?: string;
  currentClientName?: string;
}

function ClientContactsSection({ taskClient, companyId }: { taskClient: TaskClient; companyId: string | undefined }) {
  const { contactPersons, isLoading, addContact, removeContact } = useTaskClientContacts(taskClient.id, companyId);
  const { contacts: availableContacts, isLoading: loadingAvailable } = useClientContacts(companyId, taskClient.client_id);
  const [expanded, setExpanded] = useState(false);

  const assignedContactIds = new Set(contactPersons.map(cp => cp.contact_id));
  const unassignedContacts = availableContacts.filter(c => !assignedContactIds.has(c.id) && c.is_active);

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        <User className="w-3.5 h-3.5" />
        {contactPersons.length} contato(s) vinculado(s)
      </button>

      {expanded && (
        <div className="mt-2 ml-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Carregando...
            </div>
          ) : (
            <>
              {contactPersons.map(cp => (
                <div key={cp.id} className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/20 text-sm">
                  <User className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{cp.contact_name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {cp.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {cp.phone}
                        </span>
                      )}
                      {cp.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {cp.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => removeContact(cp.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}

              {unassignedContacts.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs w-full">
                      <Plus className="w-3 h-3" /> Adicionar Contato
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <div className="max-h-[200px] overflow-y-auto">
                      {unassignedContacts.map(contact => (
                        <div
                          key={contact.id}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-muted flex items-center gap-2"
                          onClick={() => addContact(contact.id)}
                        >
                          <User className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{contact.contact_name}</p>
                            <p className="text-xs text-muted-foreground">{contact.phone}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {unassignedContacts.length === 0 && availableContacts.length === 0 && !loadingAvailable && (
                <p className="text-xs text-muted-foreground italic">Nenhum contato cadastrado para este cliente.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function TaskClientsTab({ taskId, companyId, currentClientId, currentClientName }: TaskClientsTabProps) {
  const { taskClients, isLoading, addClient, isAdding, removeClient } = useTaskClients(taskId, companyId);
  const { clients } = useClients();
  const [search, setSearch] = useState('');

  const assignedClientIds = new Set(taskClients.map(tc => tc.client_id));
  // Also exclude the main related_client_id if present
  if (currentClientId) assignedClientIds.add(currentClientId);

  const sortedFilteredClients = clients
    ?.slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter(c =>
      !assignedClientIds.has(c.id) &&
      c.name.toLowerCase().includes(search.toLowerCase())
    ) || [];

  const mainClient = currentClientId ? clients?.find(c => c.id === currentClientId) : null;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-1">Clientes</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Gerencie os clientes associados a esta tarefa e seus contatos.
        </p>
      </div>

      {/* Main associated client */}
      {mainClient && (
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cliente Principal</Label>
          <div className="mt-1.5 flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
            <Avatar className="h-8 w-8">
              {mainClient.avatar && <AvatarImage src={mainClient.avatar} />}
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {mainClient.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{mainClient.name}</p>
              <p className="text-xs text-muted-foreground">Associado na aba Principal</p>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">Principal</Badge>
          </div>
        </div>
      )}

      {/* Task clients list */}
      {taskClients.length > 0 && (
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Clientes Adicionais ({taskClients.length})
          </Label>
          <div className="mt-1.5 space-y-2">
            {taskClients.map(tc => (
              <div key={tc.id} className="p-3 rounded-lg border border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {tc.client_avatar && <AvatarImage src={tc.client_avatar} />}
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                      {(tc.client_name || '?').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{tc.client_name}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeClient(tc.id)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <ClientContactsSection taskClient={tc} companyId={companyId} />
              </div>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Add client */}
      {taskId ? (
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Adicionar Cliente</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between font-normal mt-1.5" disabled={isAdding}>
                {isAdding ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Adicionando...</span>
                ) : (
                  <span className="flex items-center gap-2"><Search className="w-4 h-4" /> Pesquisar Cliente</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <div className="p-2 border-b">
                <Input
                  placeholder="Buscar cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="max-h-[250px] overflow-y-auto">
                {sortedFilteredClients.map(client => (
                  <div
                    key={client.id}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-muted flex items-center gap-2"
                    onClick={() => {
                      addClient(client.id);
                      setSearch('');
                    }}
                  >
                    <Avatar className="h-6 w-6">
                      {client.avatar && <AvatarImage src={client.avatar} />}
                      <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                        {client.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{client.name}</span>
                  </div>
                ))}
                {sortedFilteredClients.length === 0 && (
                  <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                    {search ? 'Nenhum cliente encontrado' : 'Todos os clientes já foram adicionados'}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      ) : (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <p>Salve a tarefa primeiro para adicionar clientes adicionais e contatos.</p>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando clientes...
        </div>
      )}
    </div>
  );
}
