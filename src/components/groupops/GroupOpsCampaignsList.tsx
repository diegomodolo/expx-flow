import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useGroupOpsCampaigns, CAMPAIGN_TYPES, DELIVERY_MODES, type GroupOpsCampaign } from '@/hooks/useGroupOpsCampaigns';
import { useGroupOpsGroups } from '@/hooks/useGroupOpsGroups';
import { useGroupOpsTemplates } from '@/hooks/useGroupOpsTemplates';
import {
  Plus,
  Search,
  Play,
  Pause,
  Trash2,
  Settings,
  Calendar,
  Target,
  Megaphone,
  Filter,
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Ativa', variant: 'default' },
  paused: { label: 'Pausada', variant: 'secondary' },
  draft: { label: 'Rascunho', variant: 'outline' },
  completed: { label: 'Concluída', variant: 'secondary' },
};

export default function GroupOpsCampaignsList() {
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<GroupOpsCampaign | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { groups } = useGroupOpsGroups();
  const { campaigns, isLoading, createCampaign, updateCampaign, deleteCampaign } = useGroupOpsCampaigns(selectedGroupId);
  const { templates } = useGroupOpsTemplates();

  const filtered = campaigns.filter((c) => {
    if (filterType !== 'all' && c.type !== filterType) return false;
    if (search && !c.type.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getCampaignType = (type: string) => CAMPAIGN_TYPES.find((t) => t.value === type);
  const getGroupName = (groupId: string) => groups.find((g) => g.id === groupId)?.name ?? 'Grupo';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Campanhas</h2>
          <p className="text-sm text-muted-foreground">Automações de engajamento para seus grupos</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova Campanha
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar campanhas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={selectedGroupId ?? 'all'} onValueChange={(v) => setSelectedGroupId(v === 'all' ? undefined : v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os grupos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os grupos</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {CAMPAIGN_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Campaign Cards */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando campanhas...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Nenhuma campanha encontrada</h3>
            <p className="text-sm text-muted-foreground mt-1">Crie sua primeira campanha de engajamento</p>
            <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" /> Criar Campanha
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((campaign) => {
            const typeInfo = getCampaignType(campaign.type);
            const statusInfo = STATUS_MAP[campaign.status] ?? { label: campaign.status, variant: 'outline' as const };
            return (
              <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{typeInfo?.icon ?? '📌'}</span>
                      <div>
                        <CardTitle className="text-base">{typeInfo?.label ?? campaign.type}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{getGroupName(campaign.group_id)}</p>
                      </div>
                    </div>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{typeInfo?.description ?? 'Campanha personalizada'}</p>
                  
                  <div className="flex flex-wrap gap-2 text-xs">
                    {campaign.delivery_mode && (
                      <Badge variant="outline" className="gap-1">
                        <Target className="h-3 w-3" />
                        {DELIVERY_MODES.find((d) => d.value === campaign.delivery_mode)?.label ?? campaign.delivery_mode}
                      </Badge>
                    )}
                    {campaign.schedule_rule && (
                      <Badge variant="outline" className="gap-1">
                        <Calendar className="h-3 w-3" />
                        {campaign.schedule_rule}
                      </Badge>
                    )}
                    {campaign.approval_required && (
                      <Badge variant="outline" className="gap-1">Aprovação</Badge>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    {campaign.status === 'active' ? (
                      <Button size="sm" variant="outline" onClick={() => updateCampaign.mutate({ id: campaign.id, status: 'paused' })}>
                        <Pause className="h-3 w-3 mr-1" /> Pausar
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => updateCampaign.mutate({ id: campaign.id, status: 'active' })}>
                        <Play className="h-3 w-3 mr-1" /> Ativar
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setEditingCampaign(campaign)}>
                      <Settings className="h-3 w-3 mr-1" /> Editar
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => setDeletingId(campaign.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <CampaignFormModal
        open={showCreateModal || !!editingCampaign}
        onClose={() => { setShowCreateModal(false); setEditingCampaign(null); }}
        campaign={editingCampaign}
        groups={groups}
        templates={templates}
        onSave={(data) => {
          if (editingCampaign) {
            updateCampaign.mutate({ id: editingCampaign.id, ...data });
          } else {
            createCampaign.mutate(data);
          }
          setShowCreateModal(false);
          setEditingCampaign(null);
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deletingId) { deleteCampaign.mutate(deletingId); setDeletingId(null); } }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ===== Campaign Form Modal ===== */
interface FormModalProps {
  open: boolean;
  onClose: () => void;
  campaign: GroupOpsCampaign | null;
  groups: Array<{ id: string; name: string }>;
  templates: Array<{ id: string; title: string; category: string }>;
  onSave: (data: Partial<GroupOpsCampaign>) => void;
}

function CampaignFormModal({ open, onClose, campaign, groups, templates, onSave }: FormModalProps) {
  const [type, setType] = useState(campaign?.type ?? 'DAILY_PROMPT');
  const [groupId, setGroupId] = useState(campaign?.group_id ?? '');
  const [templateId, setTemplateId] = useState(campaign?.template_id ?? '');
  const [deliveryMode, setDeliveryMode] = useState(campaign?.delivery_mode ?? 'group');
  const [scheduleRule, setScheduleRule] = useState(campaign?.schedule_rule ?? '');
  const [approvalRequired, setApprovalRequired] = useState(campaign?.approval_required ?? false);
  const [status, setStatus] = useState(campaign?.status ?? 'draft');

  React.useEffect(() => {
    if (campaign) {
      setType(campaign.type);
      setGroupId(campaign.group_id);
      setTemplateId(campaign.template_id ?? '');
      setDeliveryMode(campaign.delivery_mode ?? 'group');
      setScheduleRule(campaign.schedule_rule ?? '');
      setApprovalRequired(campaign.approval_required ?? false);
      setStatus(campaign.status);
    } else {
      setType('DAILY_PROMPT');
      setGroupId('');
      setTemplateId('');
      setDeliveryMode('group');
      setScheduleRule('');
      setApprovalRequired(false);
      setStatus('draft');
    }
  }, [campaign, open]);

  const filteredTemplates = templates.filter((t) => t.category === type || type === 'CUSTOM');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{campaign ? 'Editar Campanha' : 'Nova Campanha'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Tipo da Campanha</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CAMPAIGN_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.icon} {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{CAMPAIGN_TYPES.find((t) => t.value === type)?.description}</p>
          </div>

          <div className="space-y-2">
            <Label>Grupo</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger><SelectValue placeholder="Selecione o grupo" /></SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Template (opcional)</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder="Selecione um template" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhum</SelectItem>
                {filteredTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Modo de Envio</Label>
              <Select value={deliveryMode} onValueChange={setDeliveryMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DELIVERY_MODES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="paused">Pausada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Regra de Agendamento</Label>
            <Input placeholder="Ex: diário às 9h, seg/qua/sex" value={scheduleRule} onChange={(e) => setScheduleRule(e.target.value)} />
            <p className="text-xs text-muted-foreground">Descreva quando a campanha deve ser executada</p>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={approvalRequired} onCheckedChange={setApprovalRequired} />
            <Label>Exigir aprovação antes de enviar</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!groupId} onClick={() => onSave({
            type,
            group_id: groupId,
            template_id: templateId || null,
            delivery_mode: deliveryMode,
            schedule_rule: scheduleRule || null,
            approval_required: approvalRequired,
            status,
          })}>
            {campaign ? 'Salvar' : 'Criar Campanha'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
