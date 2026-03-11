import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { X, Plus, UserPlus, Mail } from "lucide-react";

interface Participant {
  email: string;
  name: string;
  type: 'employee' | 'client_contact' | 'custom';
}

interface CreateMeetingModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    clientId?: string;
    squadId?: string;
    scheduledAt?: string;
    participants?: Participant[];
    timezoneOffset?: number;
  }) => Promise<unknown>;
  creating: boolean;
}

export function CreateMeetingModal({ open, onClose, onSubmit, creating }: CreateMeetingModalProps) {
  const { activeCompany } = useCompany();
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [squadId, setSquadId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string; email: string }[]>([]);
  const [clientContacts, setClientContacts] = useState<{ id: string; contact_name: string; email: string }[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [showCustomEmailInput, setShowCustomEmailInput] = useState(false);

  useEffect(() => {
    if (!open || !activeCompany?.company_id) return;
    
    const fetchData = async () => {
      const [clientsRes, teamsRes, employeesRes] = await Promise.all([
        supabase.from('clients').select('id, name').eq('company_id', activeCompany.company_id).order('name'),
        supabase.from('teams').select('id, name').eq('company_id', activeCompany.company_id).order('name'),
        supabase.from('employees').select('id, name, email').eq('company_id', activeCompany.company_id).eq('status', 'active').order('name'),
      ]);
      setClients(clientsRes.data || []);
      setTeams(teamsRes.data || []);
      setEmployees((employeesRes.data || []).filter(e => e.email));
    };
    fetchData();
  }, [open, activeCompany?.company_id]);

  // Load client contacts when client is selected
  useEffect(() => {
    if (!clientId || !activeCompany?.company_id) {
      setClientContacts([]);
      return;
    }

    const fetchContacts = async () => {
      const { data } = await supabase
        .from('client_contacts' as unknown)
        .select('id, contact_name, email')
        .eq('client_id', clientId)
        .not('email', 'is', null)
        .order('contact_name');
      setClientContacts(((data as unknown[]) || []).filter((c: unknown) => c.email));
    };
    fetchContacts();
  }, [clientId, activeCompany?.company_id]);

  const addEmployeeAsParticipant = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp || participants.some(p => p.email === emp.email)) return;
    setParticipants(prev => [...prev, { email: emp.email, name: emp.name, type: 'employee' }]);
  };

  const addClientContactAsParticipant = (contactId: string) => {
    const contact = clientContacts.find(c => c.id === contactId);
    if (!contact || participants.some(p => p.email === contact.email)) return;
    setParticipants(prev => [...prev, { email: contact.email, name: contact.contact_name, type: 'client_contact' }]);
  };

  const addCustomParticipant = () => {
    if (!customEmail.trim() || participants.some(p => p.email === customEmail.trim())) return;
    setParticipants(prev => [...prev, { 
      email: customEmail.trim(), 
      name: customName.trim() || customEmail.trim(), 
      type: 'custom' 
    }]);
    setCustomEmail("");
    setCustomName("");
    setShowCustomEmailInput(false);
  };

  const removeParticipant = (email: string) => {
    setParticipants(prev => prev.filter(p => p.email !== email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const result = await onSubmit({
      title: title.trim(),
      clientId: clientId || undefined,
      squadId: squadId || undefined,
      scheduledAt: scheduledAt || undefined,
      participants: participants.length > 0 ? participants : undefined,
      timezoneOffset: new Date().getTimezoneOffset(),
    });

    if (result) {
      setTitle("");
      setClientId("");
      setSquadId("");
      setScheduledAt("");
      setParticipants([]);
      setCustomEmail("");
      setCustomName("");
      setShowCustomEmailInput(false);
      onClose();
    }
  };

  const participantTypeLabel: Record<string, string> = {
    employee: 'Colaborador',
    client_contact: 'Contato',
    custom: 'Externo',
  };

  const participantTypeColor: Record<string, string> = {
    employee: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    client_contact: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    custom: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Reunião Google Meet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reunião de alinhamento"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar cliente (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Squad</Label>
            <Select value={squadId} onValueChange={setSquadId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar squad (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduledAt">Data/Hora</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>

          {/* Participants Section */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Participantes
            </Label>

            {/* Add Employee */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Colaboradores</Label>
              <Select onValueChange={addEmployeeAsParticipant} value="">
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Adicionar colaborador..." />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter(e => !participants.some(p => p.email === e.email))
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} ({e.email})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Add Client Contact */}
            {clientContacts.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Contatos do Cliente</Label>
                <Select onValueChange={addClientContactAsParticipant} value="">
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Adicionar contato do cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientContacts
                      .filter(c => !participants.some(p => p.email === c.email))
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.contact_name} ({c.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Custom Email */}
            {showCustomEmailInput ? (
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <Input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Nome (opcional)"
                    className="h-9"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">E-mail</Label>
                  <Input
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    type="email"
                    className="h-9"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomParticipant();
                      }
                    }}
                  />
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addCustomParticipant} className="h-9">
                  <Plus className="h-4 w-4" />
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowCustomEmailInput(false)} className="h-9">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 w-full"
                onClick={() => setShowCustomEmailInput(true)}
              >
                <Mail className="h-4 w-4" />
                Adicionar e-mail avulso
              </Button>
            )}

            {/* Participants List */}
            {participants.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {participants.map((p) => (
                  <Badge
                    key={p.email}
                    variant="secondary"
                    className={`gap-1 pr-1 ${participantTypeColor[p.type] || ''}`}
                  >
                    <span className="text-xs">{p.name}</span>
                    <span className="text-[10px] opacity-70">({participantTypeLabel[p.type]})</span>
                    <button
                      type="button"
                      onClick={() => removeParticipant(p.email)}
                      className="ml-1 rounded-full hover:bg-black/10 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={creating || !title.trim()}>
              {creating ? "Criando..." : "Criar Reunião"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
