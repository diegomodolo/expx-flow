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
import { useGroupOpsMembers } from '@/hooks/useGroupOpsMembers';
import { useGroupOpsGroups } from '@/hooks/useGroupOpsGroups';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Search, MessageCircle, Volume2, VolumeX, Ban, RefreshCw, Loader2, Building2, Link, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import type { GroupOpsMember } from '@/hooks/useGroupOpsMembers';

interface MergedMember {
  /** Primary member record (first found) */
  primary: GroupOpsMember;
  /** All group_ids this phone belongs to */
  groupIds: string[];
  /** All member record ids (for actions) */
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

  // When a specific group is selected, fetch only that group; otherwise fetch all
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

  // Build a group name map
  const groupMap = useMemo(() => {
    const map: Record<string, { name: string; avatar?: string | null }> = {};
    for (const g of groups) {
      map[g.id] = { name: g.name, avatar: (g as any).avatar_url };
    }
    return map;
  }, [groups]);

  // Merge members by phone_e164 (group dedup)
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
        // Keep the record with the most data as primary
        if (!existing.primary.display_name && m.display_name) existing.primary = m;
      } else {
        phoneMap.set(key, { primary: m, groupIds: [m.group_id], memberIds: [m.id] });
      }
    }

    return [...phoneMap.values(), ...noPhoneList];
  }, [members]);

  const selectedGroupData = groups.find(g => g.id === selectedGroup);

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

      await supabase
        .from('whatsapp_client_contacts')
        .delete()
        .eq('company_id', companyId)
        .eq('phone', phone);

      const { error } = await supabase
        .from('whatsapp_client_contacts')
        .insert({
          company_id: companyId,
          client_id: clientId,
          phone: phone,
          contact_name: memberName || phone,
          is_active: true,
        } as any);

      if (error) throw error;
      toast.success(`Número associado a ${clientName}`);
      queryClient.invalidateQueries({ queryKey: ['groupops-client-matches'] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao associar cliente');
    } finally {
      setLinkingMemberId(null);
    }
  };

  // Filter on merged members
  const filtered = mergedMembers.filter((mm) => {
    const m = mm.primary;
    if (search && !m.display_name?.toLowerCase().includes(search.toLowerCase()) && !m.phone_e164?.includes(search)) return false;
    if (riskFilter !== 'all' && m.risk_level !== riskFilter) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    // If filtering by group, only show members that belong to that group
    if (selectedGroup && !mm.groupIds.includes(selectedGroup)) return false;
    return true;
  });

  const riskColor: Record<string, string> = {
    low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    mid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  const roleLabel: Record<string, string> = { dono: 'Dono', admin: 'Admin', membro: 'Membro', member: 'Membro', owner: 'Dono' };

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Membros ({filtered.length})
        </h2>
        {selectedGroup && (
          <Button size="sm" variant="outline" className="gap-2" onClick={handleResync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Reimportar Membros
          </Button>
        )}
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
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Risco" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="low">Baixo</SelectItem>
            <SelectItem value="mid">Médio</SelectItem>
            <SelectItem value="high">Alto</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
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
                            // Update all member records for this person
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
