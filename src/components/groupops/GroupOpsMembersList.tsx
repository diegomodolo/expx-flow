import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useGroupOpsMembers } from '@/hooks/useGroupOpsMembers';
import { useGroupOpsGroups } from '@/hooks/useGroupOpsGroups';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Search, MessageCircle, Volume2, VolumeX, Ban, RefreshCw, Loader2, Building2, Link, MoreHorizontal, UserPlus, Trash2, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { GroupOpsMember } from '@/hooks/useGroupOpsMembers';

interface MergedMember {
  primary: GroupOpsMember;
  groupIds: string[];
  memberIds: string[];
}

export default function GroupOpsMembersList() {
  const { groups } = useGroupOpsGroups();
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [syncing, setSyncing] = useState(false);
  const [linkingMemberId, setLinkingMemberId] = useState<string | null>(null);

  // Dialogs
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [removeCompanyOpen, setRemoveCompanyOpen] = useState(false);

  const { members, isLoading, updateMember } = useGroupOpsMembers(selectedGroup);

  // Fetch client associations by phone
  const clientMatchQuery = useQuery({
    queryKey: ['groupops-client-matches', companyId],
    queryFn: async () => {
      if (!companyId) return {};
      const { data, error } = await supabase
        .from('whatsapp_client_contacts')
        .select('phone, clients!whatsapp_client_contacts_client_id_fkey(name, avatar)')
        .eq('company_id', companyId);
      if (error) throw error;
      const map: Record<string, { name: string; avatar: string | null }> = {};
      for (const row of (data || [])) {
        const client = row.clients as any;
        if (row.phone && client) {
          map[row.phone] = { name: client.name, avatar: client.avatar };
        }
      }
      return map;
    },
    enabled: !!companyId,
  });

  // Fetch all clients for the linker
  const clientsQuery = useQuery({
    queryKey: ['all-clients-for-link', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, avatar')
        .eq('company_id', companyId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Array<{ id: string; name: string; avatar: string | null }>;
    },
    enabled: !!companyId,
  });

  const clientMap = clientMatchQuery.data ?? {};

  const groupMap = useMemo(() => {
    const map: Record<string, { name: string; avatar?: string | null }> = {};
    for (const g of groups) {
      map[g.id] = { name: g.name, avatar: (g as any).avatar_url };
    }
    return map;
  }, [groups]);

  // Merge members by phone_e164
  const mergedMembers = useMemo(() => {
    const phoneMap = new Map<string, MergedMember>();
    const noPhoneList: MergedMember[] = [];
    for (const m of members) {
      const key = m.phone_e164;
      if (!key) {
        noPhoneList.push({ primary: m, groupIds: [m.group_id], memberIds: [m.id] });
        continue;
      }
      const existing = phoneMap.get(key);
      if (existing) {
        if (!existing.groupIds.includes(m.group_id)) existing.groupIds.push(m.group_id);
        existing.memberIds.push(m.id);
        if (!existing.primary.display_name && m.display_name) existing.primary = m;
      } else {
        phoneMap.set(key, { primary: m, groupIds: [m.group_id], memberIds: [m.id] });
      }
    }
    return [...phoneMap.values(), ...noPhoneList];
  }, [members]);

  const selectedGroupData = groups.find(g => g.id === selectedGroup);

  // --- Handlers ---

  const handleResync = async () => {
    if (!selectedGroup || !selectedGroupData || !companyId) return;
    const instanceId = selectedGroupData.config_json?.instance_id;
    const groupJid = selectedGroupData.provider_group_id;
    if (!instanceId || !groupJid) {
      toast.error('Grupo sem instância ou JID configurado');
      return;
    }
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-groupops-members', {
        body: { company_id: companyId, instance_id: instanceId, group_jid: groupJid, groupops_group_id: selectedGroup },
      });
      if (error) throw error;
      toast.success(`${data?.synced || 0} membro(s) sincronizado(s)`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao sincronizar membros');
    } finally {
      setSyncing(false);
    }
  };

  const handleLinkClient = async (phone: string, clientId: string, clientName: string, memberName?: string) => {
    if (!companyId || !phone) return;
    setLinkingMemberId(phone);
    try {
      const { data: existing } = await supabase
        .from('whatsapp_client_contacts')
        .select('id')
        .eq('company_id', companyId)
        .eq('phone', phone)
        .eq('client_id', clientId)
        .maybeSingle();
      if (existing) {
        toast.info('Este número já está associado a este cliente');
        setLinkingMemberId(null);
        return;
      }
      await supabase.from('whatsapp_client_contacts').delete().eq('company_id', companyId).eq('phone', phone);
      const { error } = await supabase
        .from('whatsapp_client_contacts')
        .insert({ company_id: companyId, client_id: clientId, phone, contact_name: memberName || phone, is_active: true } as any);
      if (error) throw error;
      toast.success(`Número associado a ${clientName}`);
      queryClient.invalidateQueries({ queryKey: ['groupops-client-matches'] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao associar cliente');
    } finally {
      setLinkingMemberId(null);
    }
  };

  // Filters
  const filtered = mergedMembers.filter((mm) => {
    const m = mm.primary;
    if (search && !m.display_name?.toLowerCase().includes(search.toLowerCase()) && !m.phone_e164?.includes(search)) return false;
    if (riskFilter !== 'all' && m.risk_level !== riskFilter) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (selectedGroup && !mm.groupIds.includes(selectedGroup)) return false;
    return true;
  });

  const riskColor: Record<string, string> = {
    low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    mid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return '-';
    if (phone.length >= 12 && phone.startsWith('55')) {
      const ddd = phone.substring(2, 4);
      const rest = phone.substring(4);
      if (rest.length === 9) return `+55 (${ddd}) ${rest.substring(0, 5)}-${rest.substring(5)}`;
      if (rest.length === 8) return `+55 (${ddd}) ${rest.substring(0, 4)}-${rest.substring(4)}`;
    }
    return `+${phone}`;
  };

  // Unique clients present in current filtered members (for remove company dialog)
  const clientsInGroup = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{ name: string; avatar: string | null }> = [];
    for (const mm of filtered) {
      const phone = mm.primary.phone_e164;
      if (phone && clientMap[phone] && !seen.has(clientMap[phone].name)) {
        seen.add(clientMap[phone].name);
        result.push(clientMap[phone]);
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered, clientMap]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Membros ({filtered.length})
        </h2>
        <div className="flex items-center gap-2">
          {selectedGroup && (
            <>
              <Button size="sm" variant="default" className="gap-2" onClick={() => setAddMembersOpen(true)}>
                <UserPlus className="h-4 w-4" /> Adicionar Membros
              </Button>
              <Button size="sm" variant="outline" className="gap-2 text-destructive hover:text-destructive" onClick={() => setRemoveCompanyOpen(true)}>
                <Trash2 className="h-4 w-4" /> Remover Empresa
              </Button>
              <Button size="sm" variant="outline" className="gap-2" onClick={handleResync} disabled={syncing}>
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Reimportar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={selectedGroup ?? 'all'} onValueChange={(v) => setSelectedGroup(v === 'all' ? undefined : v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos os grupos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os grupos</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou telefone" className="pl-9" />
        </div>

        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Risco" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="low">Baixo</SelectItem>
            <SelectItem value="mid">Médio</SelectItem>
            <SelectItem value="high">Alto</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="muted">Mutado</SelectItem>
            <SelectItem value="banned">Banido</SelectItem>
            <SelectItem value="left">Saiu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum membro encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Grupos</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Dor</TableHead>
                  <TableHead>Risco</TableHead>
                  <TableHead>Streak</TableHead>
                  <TableHead>Silêncio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((mm) => {
                  const m = mm.primary;
                  const profilePic = (m.privacy_flags as any)?.profile_pic || null;
                  const match = m.phone_e164 ? clientMap[m.phone_e164] : null;

                  return (
                    <TableRow key={m.phone_e164 || m.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={profilePic} alt={m.display_name || ''} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {(m.display_name || '?').substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{m.display_name || 'Sem nome'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">{formatPhone(m.phone_e164)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {mm.groupIds.map((gid) => {
                            const g = groupMap[gid];
                            if (!g) return null;
                            return (
                              <Tooltip key={gid}>
                                <TooltipTrigger asChild>
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 max-w-[100px] truncate cursor-default">
                                    {g.name}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top"><p>{g.name}</p></TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {match ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={match.avatar || undefined} alt={match.name} />
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                <Building2 className="h-3 w-3" />
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium truncate max-w-[140px]">{match.name}</span>
                          </div>
                        ) : m.phone_e164 ? (
                          <ClientLinkerPopover
                            phone={m.phone_e164}
                            clients={clientsQuery.data ?? []}
                            isLinking={linkingMemberId === m.phone_e164}
                            onLink={(clientId, clientName) => handleLinkClient(m.phone_e164!, clientId, clientName, m.display_name || undefined)}
                          />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{m.primary_pain ?? '-'}</TableCell>
                      <TableCell>
                        <Badge className={riskColor[m.risk_level]}>{m.risk_level}</Badge>
                      </TableCell>
                      <TableCell>{m.streak_days}d</TableCell>
                      <TableCell>{m.silent_days}d</TableCell>
                      <TableCell>
                        <Badge variant={m.status === 'active' ? 'default' : 'secondary'}>{m.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <MemberActionsMenu
                          memberIds={mm.memberIds}
                          currentStatus={m.status}
                          onUpdateStatus={(status) => {
                            mm.memberIds.forEach((mid) => updateMember.mutate({ id: mid, status }));
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add Members Dialog */}
      {selectedGroup && (
        <AddMembersDialog
          open={addMembersOpen}
          onOpenChange={setAddMembersOpen}
          groupId={selectedGroup}
          groupName={groupMap[selectedGroup]?.name || ''}
          companyId={companyId!}
          clients={clientsQuery.data ?? []}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['groupops-members'] });
            queryClient.invalidateQueries({ queryKey: ['groupops-client-matches'] });
          }}
        />
      )}

      {/* Remove Company Dialog */}
      {selectedGroup && (
        <RemoveCompanyDialog
          open={removeCompanyOpen}
          onOpenChange={setRemoveCompanyOpen}
          groupId={selectedGroup}
          groupName={groupMap[selectedGroup]?.name || ''}
          companyId={companyId!}
          clients={clientsQuery.data ?? []}
          members={filtered}
          clientMap={clientMap}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['groupops-members'] });
          }}
        />
      )}
    </div>
  );
}

/* ===== Member Actions Dropdown ===== */
function MemberActionsMenu({
  memberIds,
  currentStatus,
  onUpdateStatus,
}: {
  memberIds: string[];
  currentStatus: string;
  onUpdateStatus: (status: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled className="gap-2">
          <MessageCircle className="h-4 w-4" /> Enviar DM
        </DropdownMenuItem>
        {currentStatus === 'muted' ? (
          <DropdownMenuItem onClick={() => onUpdateStatus('active')} className="gap-2">
            <Volume2 className="h-4 w-4" /> Desmutar
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onUpdateStatus('muted')} className="gap-2">
            <VolumeX className="h-4 w-4" /> Mutar
          </DropdownMenuItem>
        )}
        {currentStatus !== 'banned' && (
          <DropdownMenuItem onClick={() => onUpdateStatus('banned')} className="gap-2 text-destructive focus:text-destructive">
            <Ban className="h-4 w-4" /> Remover do grupo
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ===== Client Linker Popover ===== */
function ClientLinkerPopover({
  phone,
  clients,
  isLinking,
  onLink,
}: {
  phone: string;
  clients: Array<{ id: string; name: string; avatar: string | null }>;
  isLinking: boolean;
  onLink: (clientId: string, clientName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, clientSearch]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" disabled={isLinking}>
          {isLinking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link className="h-3 w-3" />}
          Associar
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Buscar cliente..."
              className="h-8 pl-8 text-sm"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-[240px] overflow-y-auto">
          {filteredClients.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Nenhum cliente encontrado</div>
          ) : (
            filteredClients.map((client) => (
              <button
                key={client.id}
                type="button"
                className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                onClick={() => {
                  onLink(client.id, client.name);
                  setOpen(false);
                  setClientSearch('');
                }}
              >
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={client.avatar || undefined} alt={client.name} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    <Building2 className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{client.name}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ===== Add Members Dialog ===== */
function AddMembersDialog({
  open,
  onOpenChange,
  groupId,
  groupName,
  companyId,
  clients,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  groupId: string;
  groupName: string;
  companyId: string;
  clients: Array<{ id: string; name: string; avatar: string | null }>;
  onSuccess: () => void;
}) {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientSearch, setClientSearch] = useState('');
  const [phones, setPhones] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, clientSearch]);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const normalizePhone = (raw: string) => {
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('0')) digits = digits.substring(1);
    if (!digits.startsWith('55') && digits.length <= 11) digits = '55' + digits;
    return digits;
  };

  const addPhoneRow = () => setPhones(prev => [...prev, '']);
  const removePhoneRow = (idx: number) => setPhones(prev => prev.filter((_, i) => i !== idx));
  const updatePhone = (idx: number, val: string) => setPhones(prev => prev.map((p, i) => i === idx ? val : p));

  const validPhones = phones.map(p => normalizePhone(p)).filter(p => p.length >= 12);

  const handleSave = async () => {
    if (!selectedClientId || validPhones.length === 0) {
      toast.error('Selecione um cliente e adicione pelo menos um telefone válido');
      return;
    }
    setSaving(true);
    try {
      const clientName = selectedClient?.name || '';

      // Insert member records
      const memberInserts = validPhones.map(phone => ({
        group_id: groupId,
        company_id: companyId,
        phone_e164: phone,
        display_name: phone,
        status: 'active',
        risk_level: 'low',
        streak_days: 0,
        silent_days: 0,
        tags: [],
      }));

      const { error: memberErr } = await supabase.from('groupops_members').insert(memberInserts as any);
      if (memberErr) throw memberErr;

      // Associate phones with client
      const contactInserts = validPhones.map(phone => ({
        company_id: companyId,
        client_id: selectedClientId,
        phone,
        contact_name: clientName || phone,
        is_active: true,
      }));

      // Upsert: delete existing then insert
      for (const phone of validPhones) {
        await supabase.from('whatsapp_client_contacts').delete().eq('company_id', companyId).eq('phone', phone);
      }
      const { error: contactErr } = await supabase.from('whatsapp_client_contacts').insert(contactInserts as any);
      if (contactErr) throw contactErr;

      toast.success(`${validPhones.length} membro(s) adicionado(s) ao grupo`);
      onSuccess();
      onOpenChange(false);
      // Reset
      setSelectedClientId('');
      setPhones(['']);
      setClientSearch('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao adicionar membros');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Adicionar Membros
          </DialogTitle>
          <DialogDescription>
            Adicione membros ao grupo <strong>{groupName}</strong> associados a um cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Client selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Cliente</label>
            {selectedClient ? (
              <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={selectedClient.avatar || undefined} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary"><Building2 className="h-3 w-3" /></AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium flex-1">{selectedClient.name}</span>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setSelectedClientId('')}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Buscar cliente..."
                    className="h-9 pl-8 text-sm"
                  />
                </div>
                <div className="max-h-[160px] overflow-y-auto border rounded-md">
                  {filteredClients.length === 0 ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">Nenhum cliente</div>
                  ) : (
                    filteredClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                        onClick={() => { setSelectedClientId(c.id); setClientSearch(''); }}
                      >
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarImage src={c.avatar || undefined} />
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary"><Building2 className="h-3 w-3" /></AvatarFallback>
                        </Avatar>
                        <span className="truncate">{c.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Phone list */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Telefones</label>
            <div className="space-y-2">
              {phones.map((phone, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={phone}
                    onChange={(e) => updatePhone(idx, e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="flex-1 text-sm font-mono"
                  />
                  {phones.length > 1 && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => removePhoneRow(idx)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={addPhoneRow}>
              <Plus className="h-3 w-3" /> Adicionar telefone
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !selectedClientId || validPhones.length === 0} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Adicionar {validPhones.length > 0 ? `(${validPhones.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ===== Remove Company Dialog ===== */
function RemoveCompanyDialog({
  open,
  onOpenChange,
  groupId,
  groupName,
  companyId,
  clients,
  members,
  clientMap,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  groupId: string;
  groupName: string;
  companyId: string;
  clients: Array<{ id: string; name: string; avatar: string | null }>;
  members: MergedMember[];
  clientMap: Record<string, { name: string; avatar: string | null }>;
  onSuccess: () => void;
}) {
  const [selectedClientName, setSelectedClientName] = useState<string>('');
  const [clientSearch, setClientSearch] = useState('');
  const [removing, setRemoving] = useState(false);

  // Get unique client names present in the group
  const clientsInGroup = useMemo(() => {
    const seen = new Map<string, { name: string; avatar: string | null }>();
    for (const mm of members) {
      const phone = mm.primary.phone_e164;
      if (phone && clientMap[phone]) {
        const c = clientMap[phone];
        if (!seen.has(c.name)) seen.set(c.name, c);
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [members, clientMap]);

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clientsInGroup;
    const q = clientSearch.toLowerCase();
    return clientsInGroup.filter(c => c.name.toLowerCase().includes(q));
  }, [clientsInGroup, clientSearch]);

  // Members to remove
  const membersToRemove = useMemo(() => {
    if (!selectedClientName) return [];
    return members.filter(mm => {
      const phone = mm.primary.phone_e164;
      return phone && clientMap[phone]?.name === selectedClientName && mm.groupIds.includes(groupId);
    });
  }, [members, clientMap, selectedClientName, groupId]);

  const handleRemove = async () => {
    if (membersToRemove.length === 0) return;
    setRemoving(true);
    try {
      // Get all member record IDs that belong to this group
      const idsToRemove: string[] = [];
      for (const mm of membersToRemove) {
        // Find the specific member record for this group
        // memberIds correspond 1:1 with groupIds in construction, but we stored all ids
        // We need to mark them as 'banned' (removed)
        for (const mid of mm.memberIds) {
          idsToRemove.push(mid);
        }
      }

      // Update status to 'banned' (removed from group)
      const { error } = await supabase
        .from('groupops_members')
        .update({ status: 'banned' } as any)
        .in('id', idsToRemove)
        .eq('group_id', groupId);

      if (error) throw error;

      toast.success(`${membersToRemove.length} membro(s) de "${selectedClientName}" removido(s) do grupo`);
      onSuccess();
      onOpenChange(false);
      setSelectedClientName('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover membros');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" /> Remover Empresa do Grupo
          </DialogTitle>
          <DialogDescription>
            Selecione uma empresa para remover todos os seus membros do grupo <strong>{groupName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {clientsInGroup.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma empresa associada aos membros deste grupo.</p>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Buscar empresa..."
                  className="h-9 pl-8 text-sm"
                />
              </div>
              <div className="max-h-[200px] overflow-y-auto border rounded-md">
                {filteredClients.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-left text-sm transition-colors ${
                      selectedClientName === c.name ? 'bg-destructive/10 text-destructive' : 'hover:bg-accent'
                    }`}
                    onClick={() => setSelectedClientName(c.name === selectedClientName ? '' : c.name)}
                  >
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage src={c.avatar || undefined} />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary"><Building2 className="h-3 w-3" /></AvatarFallback>
                    </Avatar>
                    <span className="truncate flex-1">{c.name}</span>
                    {selectedClientName === c.name && <Badge variant="destructive" className="text-[10px]">Selecionada</Badge>}
                  </button>
                ))}
              </div>

              {selectedClientName && (
                <p className="text-sm text-muted-foreground">
                  <strong>{membersToRemove.length}</strong> membro(s) de <strong>{selectedClientName}</strong> serão removidos.
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={handleRemove}
            disabled={removing || !selectedClientName || membersToRemove.length === 0}
            className="gap-2"
          >
            {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Remover ({membersToRemove.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
