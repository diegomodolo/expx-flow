import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGroupOpsGroups, GroupOpsGroup } from '@/hooks/useGroupOpsGroups';
import { useWhatsAppInstances, WhatsAppInstance } from '@/hooks/useWhatsAppInstances';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Settings, MessageSquare, Import, Loader2, Search, Users, Wifi, WifiOff, Trash2, RefreshCw, History } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

interface WhatsAppGroup {
  jid: string;
  name: string;
  description: string | null;
  participants_count: number | null;
  profile_pic: string | null;
}

// ----------- Import Groups Modal -----------
function ImportGroupsModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;
  const { instances } = useWhatsAppInstances(companyId);
  const { groups: existingGroups, createGroup } = useGroupOpsGroups();

  const [step, setStep] = useState<'instance' | 'groups'>('instance');
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null);
  const [loading, setLoading] = useState(false);
  const [whatsappGroups, setWhatsappGroups] = useState<WhatsAppGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const activeInstances = (instances ?? []).filter(i => i.is_active && i.is_connected);
  const existingJids = new Set(existingGroups.map(g => g.provider_group_id).filter(Boolean));

  const handleSelectInstance = async (instance: WhatsAppInstance) => {
    setSelectedInstance(instance);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-whatsapp-groups', {
        body: { company_id: companyId, instance_id: instance.id },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao buscar grupos');

      setWhatsappGroups(data.groups || []);
      setStep('groups');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao buscar grupos da instância');
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (jid: string) => {
    setSelectedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(jid)) next.delete(jid);
      else next.add(jid);
      return next;
    });
  };

  const toggleAll = () => {
    const available = filteredGroups.filter(g => !existingJids.has(g.jid));
    if (selectedGroupIds.size === available.length) {
      setSelectedGroupIds(new Set());
    } else {
      setSelectedGroupIds(new Set(available.map(g => g.jid)));
    }
  };

  const handleImport = async () => {
    if (selectedGroupIds.size === 0) return;
    setSaving(true);
    let imported = 0;
    const importedGroups: { id: string; jid: string }[] = [];
    for (const jid of selectedGroupIds) {
      const wg = whatsappGroups.find(g => g.jid === jid);
      if (!wg) continue;
      try {
        const result = await createGroup.mutateAsync({
          name: wg.name,
          description: wg.description,
          provider_group_id: wg.jid,
          provider: 'uazapi',
          status: 'enabled',
          config_json: {
            auto_reply_mode: 'safe',
            instance_id: selectedInstance?.id,
            participants_count: wg.participants_count,
            profile_pic: wg.profile_pic || null,
          },
        });
        imported++;
        if (result?.id) {
          importedGroups.push({ id: result.id, jid: wg.jid });
        }
      } catch {
        // skip duplicates / errors
      }
    }
    toast.success(`${imported} grupo(s) importado(s). Sincronizando membros...`);
    onImported();
    onClose();

    // Sync members in background for each imported group
    for (const g of importedGroups) {
      supabase.functions.invoke('sync-groupops-members', {
        body: {
          company_id: companyId,
          instance_id: selectedInstance?.id,
          group_jid: g.jid,
          groupops_group_id: g.id,
        },
      }).then(({ data, error }) => {
        if (error) {
          console.error('Erro ao sincronizar membros:', error);
        } else {
          toast.success(`${data?.synced || 0} membro(s) sincronizado(s) para o grupo`);
        }
      });
    }
    setSaving(false);
  };

  const filteredGroups = whatsappGroups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {step === 'instance' && (
        <>
          <p className="text-sm text-muted-foreground">
            Selecione a instância do WhatsApp para buscar os grupos disponíveis.
          </p>

          {activeInstances.length === 0 ? (
            <div className="text-center py-8">
              <WifiOff className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma instância conectada encontrada</p>
              <p className="text-xs text-muted-foreground mt-1">Conecte uma instância UazapiGO primeiro</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {activeInstances.map(inst => (
                <button
                  key={inst.id}
                  onClick={() => handleSelectInstance(inst)}
                  disabled={loading}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left disabled:opacity-50"
                >
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Wifi className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{inst.instance_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {inst.connected_phone || inst.profile_name || 'Conectado'}
                    </p>
                  </div>
                  {loading && selectedInstance?.id === inst.id && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {step === 'groups' && (
        <>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setStep('instance'); setWhatsappGroups([]); setSelectedGroupIds(new Set()); }}>
              ← Voltar
            </Button>
            <Badge variant="outline" className="text-xs">
              {selectedInstance?.instance_name}
            </Badge>
          </div>

          {whatsappGroups.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum grupo encontrado nesta instância</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar grupo..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={toggleAll}>
                  {selectedGroupIds.size === filteredGroups.filter(g => !existingJids.has(g.jid)).length ? 'Desmarcar' : 'Selecionar'} todos
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                {whatsappGroups.length} grupo(s) encontrado(s) • {selectedGroupIds.size} selecionado(s)
              </p>

              <ScrollArea className="h-[320px] pr-2">
                <div className="space-y-1">
                  {filteredGroups.map(group => {
                    const alreadyImported = existingJids.has(group.jid);
                    const isSelected = selectedGroupIds.has(group.jid);

                    return (
                      <label
                        key={group.jid}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                          alreadyImported
                            ? 'border-border bg-muted/30 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border hover:border-muted-foreground/30'
                        }`}
                      >
                        <Checkbox
                          checked={isSelected || alreadyImported}
                          disabled={alreadyImported}
                          onCheckedChange={() => !alreadyImported && toggleGroup(group.jid)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{group.name}</p>
                            {alreadyImported && (
                              <Badge variant="secondary" className="text-[10px] shrink-0">Já importado</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            {group.participants_count && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" />{group.participants_count}
                              </span>
                            )}
                            {group.description && (
                              <span className="text-xs text-muted-foreground truncate">{group.description}</span>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={onClose}>Cancelar</Button>
                <Button
                  onClick={handleImport}
                  disabled={selectedGroupIds.size === 0 || saving}
                  className="gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Import className="h-4 w-4" />}
                  Importar {selectedGroupIds.size > 0 ? `(${selectedGroupIds.size})` : ''}
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ----------- Config Modal (existing) -----------
function GroupConfigModal({ group, onClose }: { group?: GroupOpsGroup; onClose: () => void }) {
  const { createGroup, updateGroup } = useGroupOpsGroups();
  const [name, setName] = useState(group?.name ?? '');
  const [description, setDescription] = useState(group?.description ?? '');
  const [providerId, setProviderId] = useState(group?.provider_group_id ?? '');
  const [status, setStatus] = useState(group?.status ?? 'enabled');
  const [rulesText, setRulesText] = useState(group?.rules_text ?? '');
  const [autoReplyMode, setAutoReplyMode] = useState(group?.config_json?.auto_reply_mode ?? 'safe');

  const handleSave = () => {
    const payload = {
      name,
      description: description || null,
      provider_group_id: providerId || null,
      status,
      rules_text: rulesText || null,
      config_json: {
        ...(group?.config_json ?? {}),
        auto_reply_mode: autoReplyMode,
      },
    };

    if (group) {
      updateGroup.mutate({ id: group.id, ...payload }, { onSuccess: onClose });
    } else {
      createGroup.mutate(payload, { onSuccess: onClose });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nome do Grupo</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Grupo CEO Software" />
      </div>
      <div className="space-y-2">
        <Label>ID do Grupo (WhatsApp/Uazapi)</Label>
        <Input value={providerId} onChange={(e) => setProviderId(e.target.value)} placeholder="ID do provider" />
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="enabled">Ativo</SelectItem>
              <SelectItem value="paused">Pausado</SelectItem>
              <SelectItem value="archived">Arquivado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Modo Bot</Label>
          <Select value={autoReplyMode} onValueChange={setAutoReplyMode}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Off</SelectItem>
              <SelectItem value="safe">Safe</SelectItem>
              <SelectItem value="full">Full</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Regras do Grupo</Label>
        <Textarea value={rulesText} onChange={(e) => setRulesText(e.target.value)} rows={4} placeholder="Regras do grupo..." />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} disabled={!name || createGroup.isPending || updateGroup.isPending}>
          {group ? 'Salvar' : 'Criar Grupo'}
        </Button>
      </div>
    </div>
  );
}

// ----------- Sync History Dialog -----------
function SyncHistoryDialog({ group, instances, onClose }: { 
  group: GroupOpsGroup; 
  instances: WhatsAppInstance[]; 
  onClose: () => void;
}) {
  const [syncMode, setSyncMode] = useState<'quantity' | 'date'>('quantity');
  const [quantity, setQuantity] = useState(500);
  const [sinceDate, setSinceDate] = useState('');
  const [selectedInstance, setSelectedInstance] = useState(instances.find(i => i.is_connected)?.id ?? '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSync = async () => {
    if (!selectedInstance) {
      toast.error('Selecione uma instância');
      return;
    }
    setIsSyncing(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('groupops-sync-history', {
        body: {
          group_id: group.id,
          instance_id: selectedInstance,
          sync_mode: syncMode,
          sync_value: syncMode === 'quantity' ? quantity : sinceDate,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro desconhecido');
      setResult(data);
      toast.success(`Sincronização concluída: ${data.messages_imported} mensagens, ${data.members_processed} membros`);
    } catch (err: any) {
      toast.error(`Erro na sincronização: ${err.message}`, { duration: 10000 });
    } finally {
      setIsSyncing(false);
    }
  };

  const connectedInstances = instances.filter(i => i.is_connected);

  return (
    <div className="space-y-4">
      <DialogDescription>
        Importa mensagens do histórico do grupo para calcular scores, detectar membros ativos e identificar silenciosos.
      </DialogDescription>

      <div className="space-y-2">
        <Label>Instância WhatsApp</Label>
        <Select value={selectedInstance} onValueChange={setSelectedInstance}>
          <SelectTrigger><SelectValue placeholder="Selecione uma instância" /></SelectTrigger>
          <SelectContent>
            {connectedInstances.map(inst => (
              <SelectItem key={inst.id} value={inst.id}>{inst.instance_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {connectedInstances.length === 0 && (
          <p className="text-xs text-destructive">Nenhuma instância conectada disponível</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Método de sincronização</Label>
        <Select value={syncMode} onValueChange={(v) => setSyncMode(v as 'quantity' | 'date')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="quantity">Por quantidade de mensagens</SelectItem>
            <SelectItem value="date">Por data (desde)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {syncMode === 'quantity' ? (
        <div className="space-y-2">
          <Label>Quantidade de mensagens</Label>
          <Select value={String(quantity)} onValueChange={(v) => setQuantity(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="100">100 mensagens</SelectItem>
              <SelectItem value="250">250 mensagens</SelectItem>
              <SelectItem value="500">500 mensagens</SelectItem>
              <SelectItem value="1000">1.000 mensagens</SelectItem>
              <SelectItem value="2000">2.000 mensagens</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Desde a data</Label>
          <Input type="date" value={sinceDate} onChange={(e) => setSinceDate(e.target.value)} />
        </div>
      )}

      {result && (
        <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
          <p className="font-medium text-foreground">✅ Sincronização concluída</p>
          <div className="grid grid-cols-2 gap-1 text-muted-foreground">
            <span>Mensagens importadas:</span><span className="font-medium text-foreground">{result.messages_imported}</span>
            <span>Membros novos:</span><span className="font-medium text-foreground">{result.members_created}</span>
            <span>Membros atualizados:</span><span className="font-medium text-foreground">{result.members_updated}</span>
            <span>Scores atualizados:</span><span className="font-medium text-foreground">{result.scores_updated}</span>
            <span>Membros silenciosos:</span><span className="font-medium text-destructive">{result.silent_members}</span>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={isSyncing}>Fechar</Button>
        <Button onClick={handleSync} disabled={isSyncing || !selectedInstance || (syncMode === 'date' && !sinceDate)}>
          {isSyncing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sincronizando...</> : <><RefreshCw className="h-4 w-4 mr-2" /> Sincronizar</>}
        </Button>
      </div>
    </div>
  );
}

// ----------- Main List -----------
export default function GroupOpsGroupsList() {
  const { groups, isLoading, deleteGroup } = useGroupOpsGroups();
  const [editGroup, setEditGroup] = useState<GroupOpsGroup | undefined>();
  const [configOpen, setConfigOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [syncGroup, setSyncGroup] = useState<GroupOpsGroup | undefined>();
  const { activeCompany } = useCompany();
  const { instances } = useWhatsAppInstances(activeCompany?.company_id);

  const statusColor: Record<string, string> = {
    enabled: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    archived: 'bg-muted text-muted-foreground',
  };

  const statusLabel: Record<string, string> = {
    enabled: 'Ativo',
    paused: 'Pausado',
    archived: 'Arquivado',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Grupos Gerenciados</h2>
        <div className="flex gap-2">
          {/* Import from WhatsApp */}
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <Import className="h-4 w-4" />
                Importar do WhatsApp
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Importar Grupos do WhatsApp</DialogTitle>
              </DialogHeader>
              <ImportGroupsModal
                onClose={() => setImportOpen(false)}
                onImported={() => {}}
              />
            </DialogContent>
          </Dialog>

          {/* Manual create */}
          <Dialog open={configOpen} onOpenChange={(o) => { setConfigOpen(o); if (!o) setEditGroup(undefined); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Novo Grupo</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editGroup ? 'Editar Grupo' : 'Novo Grupo'}</DialogTitle>
              </DialogHeader>
              <GroupConfigModal group={editGroup} onClose={() => { setConfigOpen(false); setEditGroup(undefined); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum grupo cadastrado</p>
            <p className="text-sm text-muted-foreground mt-1">Importe grupos do WhatsApp ou crie manualmente</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={() => setImportOpen(true)}>
              <Import className="h-4 w-4" />
              Importar do WhatsApp
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={group.config_json?.profile_pic} alt={group.name} />
                    <AvatarFallback className="bg-primary/10">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{group.name}</p>
                    <p className="text-sm text-muted-foreground">{group.description ?? 'Sem descrição'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={statusColor[group.status]}>{statusLabel[group.status]}</Badge>
                  <Badge variant="outline">Bot: {group.config_json?.auto_reply_mode ?? 'safe'}</Badge>
                  <Button size="icon" variant="ghost" title="Sincronizar histórico" onClick={() => setSyncGroup(group)}>
                    <History className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditGroup(group); setConfigOpen(true); }}>
                    <Settings className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" title="Excluir grupo">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir grupo gerenciado?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso removerá o grupo "{group.name}" e todos os dados associados (membros, mensagens, eventos). Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deleteGroup.mutate(group.id)}
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sync History Dialog */}
      <Dialog open={!!syncGroup} onOpenChange={(o) => { if (!o) setSyncGroup(undefined); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sincronizar Histórico - {syncGroup?.name}</DialogTitle>
          </DialogHeader>
          {syncGroup && (
            <SyncHistoryDialog 
              group={syncGroup} 
              instances={instances} 
              onClose={() => setSyncGroup(undefined)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
