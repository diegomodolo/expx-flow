import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useGroupOpsModeration, RULE_TYPES, ACTION_TYPES, type GroupOpsModerationRule } from '@/hooks/useGroupOpsModeration';
import { useGroupOpsGroups } from '@/hooks/useGroupOpsGroups';
import { Shield, Plus, Trash2, Edit, CheckCircle, AlertTriangle, Clock, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function GroupOpsModeration() {
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const { groups } = useGroupOpsGroups();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Moderação</h2>
          <p className="text-sm text-muted-foreground">Regras automáticas e histórico de ações de moderação</p>
        </div>
        <Select value={selectedGroupId ?? 'all'} onValueChange={(v) => setSelectedGroupId(v === 'all' ? undefined : v)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todos os grupos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os grupos</SelectItem>
            {groups.map((g) => (<SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules" className="gap-2"><Shield className="h-4 w-4" /> Regras</TabsTrigger>
          <TabsTrigger value="actions" className="gap-2"><AlertTriangle className="h-4 w-4" /> Ações</TabsTrigger>
        </TabsList>
        <TabsContent value="rules"><RulesTab groupId={selectedGroupId} /></TabsContent>
        <TabsContent value="actions"><ActionsTab groupId={selectedGroupId} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ===== Rules Tab ===== */
function RulesTab({ groupId }: { groupId?: string }) {
  const { rules, isLoading, createRule, updateRule, deleteRule } = useGroupOpsModeration(groupId);
  const { groups } = useGroupOpsGroups();
  const [showCreate, setShowCreate] = useState(false);
  const [editingRule, setEditingRule] = useState<GroupOpsModerationRule | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getRuleType = (type: string) => RULE_TYPES.find((r) => r.value === type);
  const getActionLabel = (type: string) => ACTION_TYPES.find((a) => a.value === type)?.label ?? type;
  const getGroupName = (gid: string) => groups.find((g) => g.id === gid)?.name ?? 'Grupo';

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Nova Regra</Button>
      </div>

      {rules.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Nenhuma regra de moderação</h3>
          <p className="text-sm text-muted-foreground mt-1">Crie regras para proteger seus grupos automaticamente</p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Criar Regra</Button>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((rule) => {
            const ruleType = getRuleType(rule.type);
            return (
              <Card key={rule.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {rule.name}
                        {rule.is_active ? <Badge variant="default" className="text-xs">Ativa</Badge> : <Badge variant="secondary" className="text-xs">Inativa</Badge>}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">{getGroupName(rule.group_id)}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Badge variant="outline">{ruleType?.label ?? rule.type}</Badge>
                    <Badge variant="secondary">Ação: {getActionLabel(rule.action_type)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{ruleType?.description}</p>
                  {rule.config_json && typeof rule.config_json === 'object' && (
                    <div className="text-xs bg-muted/50 rounded p-2 space-y-0.5">
                      {Object.entries(rule.config_json as Record<string, any>).map(([k, v]) => (
                        <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}:</span><span className="font-medium">{String(v)}</span></div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" onClick={() => updateRule.mutate({ id: rule.id, is_active: !rule.is_active })}>
                      {rule.is_active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingRule(rule)}><Edit className="h-3 w-3 mr-1" /> Editar</Button>
                    <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => setDeletingId(rule.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <RuleFormModal
        open={showCreate || !!editingRule}
        onClose={() => { setShowCreate(false); setEditingRule(null); }}
        rule={editingRule}
        groups={groups}
        onSave={(data) => {
          if (editingRule) updateRule.mutate({ id: editingRule.id, ...data });
          else createRule.mutate(data);
          setShowCreate(false); setEditingRule(null);
        }}
      />

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir regra?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { if (deletingId) { deleteRule.mutate(deletingId); setDeletingId(null); } }}>Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ===== Rule Form Modal ===== */
function RuleFormModal({ open, onClose, rule, groups, onSave }: { open: boolean; onClose: () => void; rule: GroupOpsModerationRule | null; groups: Array<{ id: string; name: string }>; onSave: (data: Partial<GroupOpsModerationRule>) => void }) {
  const [name, setName] = useState(rule?.name ?? '');
  const [groupId, setGroupId] = useState(rule?.group_id ?? '');
  const [type, setType] = useState(rule?.type ?? 'flood');
  const [actionType, setActionType] = useState(rule?.action_type ?? 'warn');
  const [isActive, setIsActive] = useState(rule?.is_active ?? true);
  const [configStr, setConfigStr] = useState(rule?.config_json ? JSON.stringify(rule.config_json, null, 2) : '{\n  "max_messages_per_minute": 10\n}');

  React.useEffect(() => {
    if (rule) { setName(rule.name); setGroupId(rule.group_id); setType(rule.type); setActionType(rule.action_type); setIsActive(rule.is_active ?? true); setConfigStr(rule.config_json ? JSON.stringify(rule.config_json, null, 2) : '{}'); }
    else { setName(''); setGroupId(''); setType('flood'); setActionType('warn'); setIsActive(true); setConfigStr('{\n  "max_messages_per_minute": 10\n}'); }
  }, [rule, open]);

  let parsedConfig: any = {};
  try { parsedConfig = JSON.parse(configStr); } catch {}

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{rule ? 'Editar Regra' : 'Nova Regra de Moderação'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Anti-flood geral" /></div>
          <div className="space-y-2">
            <Label>Grupo</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger><SelectValue placeholder="Selecione o grupo" /></SelectTrigger>
              <SelectContent>{groups.map((g) => (<SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RULE_TYPES.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ação</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ACTION_TYPES.map((a) => (<SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Configuração (JSON)</Label>
            <textarea value={configStr} onChange={(e) => setConfigStr(e.target.value)} rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="flex items-center gap-3"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>Regra ativa</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!name || !groupId} onClick={() => onSave({ name, group_id: groupId, type, action_type: actionType, is_active: isActive, config_json: parsedConfig })}>{rule ? 'Salvar' : 'Criar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ===== Actions Tab ===== */
function ActionsTab({ groupId }: { groupId?: string }) {
  const { actions, isLoading, resolveAction } = useGroupOpsModeration(groupId);
  const { groups } = useGroupOpsGroups();
  const [filterResolved, setFilterResolved] = useState('pending');

  const getGroupName = (gid: string) => groups.find((g) => g.id === gid)?.name ?? 'Grupo';
  const getActionLabel = (type: string) => ACTION_TYPES.find((a) => a.value === type)?.label ?? type;

  const filtered = actions.filter((a) => {
    if (filterResolved === 'pending') return !a.resolved;
    if (filterResolved === 'resolved') return a.resolved;
    return true;
  });

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Select value={filterResolved} onValueChange={setFilterResolved}>
          <SelectTrigger className="w-[180px]"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="resolved">Resolvidas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">
            {filterResolved === 'pending' ? 'Nenhuma ação pendente' : 'Nenhuma ação encontrada'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Tudo sob controle!</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((action) => (
            <Card key={action.id}>
              <CardContent className="py-3 flex items-center gap-3">
                <div className={`rounded-full p-1.5 shrink-0 ${action.resolved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {action.resolved ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{getActionLabel(action.action_type)}</Badge>
                    <span className="text-xs text-muted-foreground">{getGroupName(action.group_id)}</span>
                  </div>
                  {action.reason && <p className="text-sm text-muted-foreground mt-0.5 truncate">{action.reason}</p>}
                  <p className="text-xs text-muted-foreground">{format(new Date(action.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                </div>
                {!action.resolved && (
                  <Button size="sm" variant="outline" onClick={() => resolveAction.mutate(action.id)}>
                    <CheckCircle className="h-3 w-3 mr-1" /> Resolver
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
