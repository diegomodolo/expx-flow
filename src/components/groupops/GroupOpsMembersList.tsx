import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useGroupOpsMembers } from '@/hooks/useGroupOpsMembers';
import { useGroupOpsGroups } from '@/hooks/useGroupOpsGroups';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { Users, Search, MessageCircle, Volume2, VolumeX, Ban, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function GroupOpsMembersList() {
  const { groups } = useGroupOpsGroups();
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [syncing, setSyncing] = useState(false);

  const { members, isLoading, updateMember } = useGroupOpsMembers(selectedGroup);

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

  const filtered = members.filter((m) => {
    if (search && !m.display_name?.toLowerCase().includes(search.toLowerCase()) && !m.phone_e164?.includes(search)) return false;
    if (riskFilter !== 'all' && m.risk_level !== riskFilter) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    return true;
  });

  const riskColor: Record<string, string> = {
    low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    mid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  const statusActions = (memberId: string, currentStatus: string) => (
    <div className="flex gap-1">
      <Button size="icon" variant="ghost" title="DM" disabled>
        <MessageCircle className="h-4 w-4" />
      </Button>
      {currentStatus === 'muted' ? (
        <Button size="icon" variant="ghost" title="Desmutar" onClick={() => updateMember.mutate({ id: memberId, status: 'active' })}>
          <Volume2 className="h-4 w-4" />
        </Button>
      ) : (
        <Button size="icon" variant="ghost" title="Mutar" onClick={() => updateMember.mutate({ id: memberId, status: 'muted' })}>
          <VolumeX className="h-4 w-4" />
        </Button>
      )}
      {currentStatus !== 'banned' && (
        <Button size="icon" variant="ghost" title="Banir" onClick={() => updateMember.mutate({ id: memberId, status: 'banned' })}>
          <Ban className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </div>
  );

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
                  <TableHead>Função</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Dor</TableHead>
                  <TableHead>Risco</TableHead>
                  <TableHead>Streak</TableHead>
                  <TableHead>Silêncio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => {
                  const profilePic = (m.privacy_flags as any)?.profile_pic || null;
                  const roleLabel: Record<string, string> = { dono: 'Dono', admin: 'Admin', membro: 'Membro', member: 'Membro', owner: 'Dono' };
                  const formatPhone = (phone: string | null) => {
                    if (!phone) return '-';
                    // Format as +55 (22) 99782-5387
                    if (phone.length >= 12 && phone.startsWith('55')) {
                      const ddd = phone.substring(2, 4);
                      const rest = phone.substring(4);
                      if (rest.length === 9) return `+55 (${ddd}) ${rest.substring(0, 5)}-${rest.substring(5)}`;
                      if (rest.length === 8) return `+55 (${ddd}) ${rest.substring(0, 4)}-${rest.substring(4)}`;
                    }
                    return `+${phone}`;
                  };

                  return (
                    <TableRow key={m.id}>
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
                      <TableCell className="text-sm">
                        <Badge variant="outline">{roleLabel[m.role ?? 'membro'] ?? m.role}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.company_name ?? '-'}</TableCell>
                      <TableCell className="text-sm">{m.primary_pain ?? '-'}</TableCell>
                      <TableCell>
                        <Badge className={riskColor[m.risk_level]}>{m.risk_level}</Badge>
                      </TableCell>
                      <TableCell>{m.streak_days}d</TableCell>
                      <TableCell>{m.silent_days}d</TableCell>
                      <TableCell>
                        <Badge variant={m.status === 'active' ? 'default' : 'secondary'}>{m.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{statusActions(m.id, m.status)}</TableCell>
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
