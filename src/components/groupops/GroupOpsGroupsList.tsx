import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useGroupOpsGroups, GroupOpsGroup } from '@/hooks/useGroupOpsGroups';
import { Plus, Settings, MessageSquare } from 'lucide-react';

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

export default function GroupOpsGroupsList() {
  const { groups, isLoading } = useGroupOpsGroups();
  const [editGroup, setEditGroup] = useState<GroupOpsGroup | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);

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
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditGroup(undefined); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Novo Grupo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editGroup ? 'Editar Grupo' : 'Novo Grupo'}</DialogTitle>
            </DialogHeader>
            <GroupConfigModal group={editGroup} onClose={() => { setDialogOpen(false); setEditGroup(undefined); }} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum grupo cadastrado</p>
            <p className="text-sm text-muted-foreground mt-1">Crie um grupo para começar a gerenciar seu WhatsApp</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{group.name}</p>
                    <p className="text-sm text-muted-foreground">{group.description ?? 'Sem descrição'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={statusColor[group.status]}>{statusLabel[group.status]}</Badge>
                  <Badge variant="outline">Bot: {group.config_json?.auto_reply_mode ?? 'safe'}</Badge>
                  <Button size="icon" variant="ghost" onClick={() => { setEditGroup(group); setDialogOpen(true); }}>
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
