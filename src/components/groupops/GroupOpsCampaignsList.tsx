import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useGroupOpsCampaigns, CAMPAIGN_TYPES, DELIVERY_MODES, type GroupOpsCampaign } from '@/hooks/useGroupOpsCampaigns';
import { useGroupOpsGroups } from '@/hooks/useGroupOpsGroups';
import { useGroupOpsTemplates, TEMPLATE_CATEGORIES } from '@/hooks/useGroupOpsTemplates';
import { useWhatsAppInstances } from '@/hooks/useWhatsAppInstances';
import { useGroupOpsCampaignSendLog } from '@/hooks/useGroupOpsCampaignSendLog';
import { useCompany } from '@/contexts/CompanyContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  FileText,
  X,
  ChevronDown,
  Clock,
  Smartphone,
  Shuffle,
  ListChecks,
  History,
  AlertTriangle,
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Ativa', variant: 'default' },
  paused: { label: 'Pausada', variant: 'secondary' },
  draft: { label: 'Rascunho', variant: 'outline' },
  completed: { label: 'Concluída', variant: 'secondary' },
};

const WEEKDAYS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

// Time options removed - using native time input instead

export default function GroupOpsCampaignsList() {
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<GroupOpsCampaign | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [logCampaignId, setLogCampaignId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const testCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke('groupops-campaign-cron', {
        body: { campaign_id: campaignId },
      });
      if (error) throw error;
      if (data?.errors?.length > 0) {
        throw new Error(data.errors.join('; '));
      }
      return data;
    },
    onSuccess: (data) => {
      if (data?.executed > 0) {
        toast.success('Envio de teste realizado com sucesso');
      } else {
        toast.error('Nenhuma mensagem enviada. Verifique se há templates configurados.');
      }
    },
    onError: (err: any) => {
      toast.error(`Erro ao enviar teste: ${err?.message || 'Erro desconhecido'}`, { duration: 10000 });
    },
  });

  const { groups } = useGroupOpsGroups();
  const { campaigns, isLoading, createCampaign, updateCampaign, deleteCampaign } = useGroupOpsCampaigns(selectedGroupId);
  const { templates } = useGroupOpsTemplates();
  const { activeCompany } = useCompany();
  const { instances } = useWhatsAppInstances(activeCompany?.company_id);
  

  const filtered = campaigns.filter((c) => {
    if (filterType !== 'all' && c.type !== filterType) return false;
    if (search && !c.type.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getCampaignType = (type: string) => CAMPAIGN_TYPES.find((t) => t.value === type);
  const getGroupName = (groupId: string) => groups.find((g) => g.id === groupId)?.name ?? 'Grupo';

  const formatSchedule = (campaign: GroupOpsCampaign) => {
    const freq = campaign.schedule_frequency;
    const times = campaign.schedule_times?.join(', ') || '';
    if (freq === 'daily') return `Diário às ${times}`;
    if (freq === 'weekly') {
      const days = campaign.schedule_days_of_week?.map(d => WEEKDAYS.find(w => w.value === d)?.label).join(', ') || '';
      return `Semanal (${days}) às ${times}`;
    }
    if (freq === 'monthly') {
      return `Mensal (dia ${campaign.schedule_day_of_month}) às ${times}`;
    }
    return campaign.schedule_rule || 'Não configurado';
  };

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
            const instanceName = instances.find(i => i.id === campaign.instance_id)?.instance_name;
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
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {formatSchedule(campaign)}
                    </Badge>
                    {instanceName && (
                      <Badge variant="outline" className="gap-1">
                        <Smartphone className="h-3 w-3" />
                        {instanceName}
                      </Badge>
                    )}
                    <Badge variant="outline" className="gap-1">
                      {campaign.template_mode === 'selected' ? (
                        <><ListChecks className="h-3 w-3" /> {(campaign.selected_template_ids?.length || 0)} templates</>
                      ) : (
                        <><Shuffle className="h-3 w-3" /> Aleatório</>
                      )}
                    </Badge>
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
                    <Button size="sm" variant="outline" onClick={() => setLogCampaignId(campaign.id)}>
                      <History className="h-3 w-3 mr-1" /> Log
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      disabled={testCampaign.isPending}
                      onClick={() => testCampaign.mutate(campaign.id)}
                    >
                      <Play className="h-3 w-3 mr-1" /> Testar
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
        instances={instances}
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

      {/* Send Log Dialog */}
      <CampaignSendLogDialog
        campaignId={logCampaignId}
        onClose={() => setLogCampaignId(null)}
        templates={templates}
      />
    </div>
  );
}

/* ===== Campaign Form Modal ===== */
interface FormModalProps {
  open: boolean;
  onClose: () => void;
  campaign: GroupOpsCampaign | null;
  groups: Array<{ id: string; name: string; config_json?: any }>;
  templates: Array<{ id: string; title: string; category: string }>;
  instances: Array<{ id: string; instance_name: string; is_connected: boolean; connected_phone: string | null }>;
  onSave: (data: Partial<GroupOpsCampaign>) => void;
}

function CampaignFormModal({ open, onClose, campaign, groups, templates, instances, onSave }: FormModalProps) {
  const [type, setType] = useState(campaign?.type ?? 'DAILY_PROMPT');
  const [groupId, setGroupId] = useState(campaign?.group_id ?? '');
  const [templateId, setTemplateId] = useState(campaign?.template_id ?? '');
  const [templateMode, setTemplateMode] = useState(campaign?.template_mode ?? 'random');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(campaign?.selected_template_ids ?? []);
  const [deliveryMode, setDeliveryMode] = useState(campaign?.delivery_mode ?? 'group');
  const [approvalRequired, setApprovalRequired] = useState(campaign?.approval_required ?? false);
  const [status, setStatus] = useState(campaign?.status ?? 'draft');
  const [instanceId, setInstanceId] = useState(campaign?.instance_id ?? '');

  // Scheduling state
  const [frequency, setFrequency] = useState(campaign?.schedule_frequency ?? 'daily');
  const [scheduleTimes, setScheduleTimes] = useState<string[]>(campaign?.schedule_times ?? ['09:00']);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(campaign?.schedule_days_of_week ?? [1]);
  const [dayOfMonth, setDayOfMonth] = useState(campaign?.schedule_day_of_month ?? 1);

  React.useEffect(() => {
    if (campaign) {
      setType(campaign.type);
      setGroupId(campaign.group_id);
      setTemplateId(campaign.template_id ?? '');
      setTemplateMode(campaign.template_mode ?? 'random');
      setSelectedTemplateIds(campaign.selected_template_ids ?? []);
      setDeliveryMode(campaign.delivery_mode ?? 'group');
      setApprovalRequired(campaign.approval_required ?? false);
      setStatus(campaign.status);
      setInstanceId(campaign.instance_id ?? '');
      setFrequency(campaign.schedule_frequency ?? 'daily');
      setScheduleTimes(campaign.schedule_times ?? ['09:00']);
      setDaysOfWeek(campaign.schedule_days_of_week ?? [1]);
      setDayOfMonth(campaign.schedule_day_of_month ?? 1);
    } else {
      setType('DAILY_PROMPT');
      setGroupId('');
      setTemplateId('');
      setTemplateMode('random');
      setSelectedTemplateIds([]);
      setDeliveryMode('group');
      setApprovalRequired(false);
      setStatus('draft');
      setInstanceId('');
      setFrequency('daily');
      setScheduleTimes(['09:00']);
      setDaysOfWeek([1]);
      setDayOfMonth(1);
    }
  }, [campaign, open]);

  const filteredTemplates = templates.filter((t) => t.category === type || type === 'CUSTOM');

  const toggleDayOfWeek = (day: number) => {
    setDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const addTime = () => {
    setScheduleTimes(prev => [...prev, '09:00']);
  };

  const removeTime = (index: number) => {
    setScheduleTimes(prev => prev.filter((_, i) => i !== index));
  };

  const updateTime = (index: number, value: string) => {
    setScheduleTimes(prev => prev.map((t, i) => i === index ? value : t));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
            <Select value={groupId} onValueChange={(gid) => {
              setGroupId(gid);
              // Auto-set instance from group's config
              const group = groups.find(g => g.id === gid);
              const groupInstanceId = group?.config_json?.instance_id;
              if (groupInstanceId) {
                setInstanceId(groupInstanceId);
              }
            }}>
              <SelectTrigger><SelectValue placeholder="Selecione o grupo" /></SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Template Mode Selection */}
          <div className="space-y-3 border rounded-lg p-4">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" /> Templates
            </Label>

            {/* Mode toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={templateMode === 'random' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setTemplateMode('random')}
              >
                <Shuffle className="h-3.5 w-3.5" /> Aleatório
              </Button>
              <Button
                type="button"
                size="sm"
                variant={templateMode === 'selected' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setTemplateMode('selected')}
              >
                <ListChecks className="h-3.5 w-3.5" /> Selecionar
              </Button>
            </div>

            {templateMode === 'random' ? (
              <p className="text-xs text-muted-foreground">
                Todos os templates da categoria <strong>{CAMPAIGN_TYPES.find(t => t.value === type)?.label}</strong> serão usados aleatoriamente sem repetir. Quando todos forem enviados, o ciclo recomeça.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Selecione os templates que deseja usar. Serão enviados sem repetir até esgotar a lista, depois o ciclo recomeça.
                </p>
                <TemplateMultiSelect
                  templates={filteredTemplates}
                  selectedIds={selectedTemplateIds}
                  onChange={setSelectedTemplateIds}
                />
                {selectedTemplateIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedTemplateIds.length} template(s) selecionado(s)
                  </p>
                )}
              </>
            )}
          </div>

          <InstanceValidationSelect
            groupId={groupId}
            instanceId={instanceId}
            onInstanceChange={setInstanceId}
            instances={instances}
            groups={groups}
          />

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

          {/* ===== Structured Scheduling ===== */}
          <div className="space-y-3 border rounded-lg p-4">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Agendamento
            </Label>

            <div className="space-y-2">
              <Label className="text-xs">Frequência</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Weekly: Day of week selector */}
            {frequency === 'weekly' && (
              <div className="space-y-2">
                <Label className="text-xs">Dias da semana</Label>
                <div className="flex gap-1 flex-wrap">
                  {WEEKDAYS.map(day => (
                    <Button
                      key={day.value}
                      type="button"
                      size="sm"
                      variant={daysOfWeek.includes(day.value) ? 'default' : 'outline'}
                      className="h-8 w-11 text-xs"
                      onClick={() => toggleDayOfWeek(day.value)}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly: Day of month */}
            {frequency === 'monthly' && (
              <div className="space-y-2">
                <Label className="text-xs">Dia do mês</Label>
                <Select value={String(dayOfMonth)} onValueChange={(v) => setDayOfMonth(Number(v))}>
                  <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                      <SelectItem key={d} value={String(d)}>Dia {d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Times */}
            <div className="space-y-2">
              <Label className="text-xs">Horários (São Paulo)</Label>
              <div className="space-y-2">
                {scheduleTimes.map((time, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="relative">
                      <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        type="time"
                        value={time}
                        onChange={(e) => updateTime(i, e.target.value)}
                        className="w-[140px] pl-8 h-9"
                      />
                    </div>
                    {scheduleTimes.length > 1 && (
                      <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => removeTime(i)}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" size="sm" variant="outline" onClick={addTime} className="text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Adicionar horário
                </Button>
              </div>
            </div>
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
            template_id: templateMode === 'selected' && selectedTemplateIds.length === 1 ? selectedTemplateIds[0] : null,
            template_mode: templateMode,
            selected_template_ids: templateMode === 'selected' ? selectedTemplateIds : [],
            delivery_mode: deliveryMode,
            schedule_frequency: frequency,
            schedule_times: scheduleTimes,
            schedule_days_of_week: frequency === 'weekly' ? daysOfWeek : null,
            schedule_day_of_month: frequency === 'monthly' ? dayOfMonth : null,
            instance_id: instanceId && instanceId !== 'none' ? instanceId : null,
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

/* ===== Template Multi-Select ===== */
function TemplateMultiSelect({
  templates,
  selectedIds,
  onChange,
}: {
  templates: Array<{ id: string; title: string; category: string }>;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return templates;
    const q = search.toLowerCase();
    return templates.filter(
      (t) => t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
    );
  }, [templates, search]);

  const getCategoryLabel = (cat: string) =>
    TEMPLATE_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;

  const toggleTemplate = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id]
    );
  };

  const selectAll = () => onChange(filtered.map((t) => t.id));
  const deselectAll = () => onChange([]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9"
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="ghost" className="text-xs h-7" onClick={selectAll}>
          Selecionar todos
        </Button>
        <Button type="button" size="sm" variant="ghost" className="text-xs h-7" onClick={deselectAll}>
          Limpar
        </Button>
      </div>
      <ScrollArea className="max-h-[220px] border rounded-md">
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Nenhum template encontrado
          </div>
        ) : (
          filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors border-b last:border-0 flex items-center gap-3 ${
                selectedIds.includes(t.id) ? 'bg-accent/50' : ''
              }`}
              onClick={() => toggleTemplate(t.id)}
            >
              <Checkbox
                checked={selectedIds.includes(t.id)}
                onCheckedChange={() => toggleTemplate(t.id)}
                className="pointer-events-none"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate text-xs">{t.title}</div>
                <div className="text-xs text-muted-foreground">{getCategoryLabel(t.category)}</div>
              </div>
            </button>
          ))
        )}
      </ScrollArea>
    </div>
  );
}

/* ===== Campaign Send Log Dialog ===== */
function CampaignSendLogDialog({
  campaignId,
  onClose,
  templates,
}: {
  campaignId: string | null;
  onClose: () => void;
  templates: Array<{ id: string; title: string }>;
}) {
  const { logs, isLoading } = useGroupOpsCampaignSendLog(campaignId ?? undefined);

  const getTemplateName = (id: string) =>
    templates.find((t) => t.id === id)?.title ?? 'Template removido';

  return (
    <Dialog open={!!campaignId} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" /> Histórico de Envios
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum envio registrado ainda</p>
              <p className="text-xs mt-1">Os envios aparecerão aqui quando a campanha for executada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-md p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate flex-1">{getTemplateName(log.template_id)}</span>
                    <Badge variant="outline" className="text-xs ml-2">Ciclo {log.cycle_number}</Badge>
                  </div>
                  {log.message_preview && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{log.message_preview}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(log.sent_at).toLocaleString('pt-BR')}
                    {log.delivery_status && (
                      <Badge variant={log.delivery_status === 'sent' ? 'default' : 'destructive'} className="text-xs h-5">
                        {log.delivery_status === 'sent' ? 'Enviado' : log.delivery_status}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

/* ===== Instance Validation Select ===== */
function InstanceValidationSelect({
  groupId,
  instanceId,
  onInstanceChange,
  instances,
  groups,
}: {
  groupId: string;
  instanceId: string;
  onInstanceChange: (id: string) => void;
  instances: Array<{ id: string; instance_name: string; is_connected: boolean; connected_phone: string | null }>;
  groups: Array<{ id: string; name: string; config_json?: any }>;
}) {
  // Fetch group members' phones to validate instance membership
  const { data: memberPhones } = useQuery({
    queryKey: ['groupops-member-phones', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from('groupops_members' as any)
        .select('phone_e164')
        .eq('group_id', groupId)
        .not('phone_e164', 'is', null);
      if (error) return [];
      return (data ?? []).map((m: any) => m.phone_e164 as string);
    },
    enabled: !!groupId,
  });

  const selectedGroup = groups.find(g => g.id === groupId);
  const groupInstanceId = selectedGroup?.config_json?.instance_id;

  // Check if instance phone is a member of the group
  const selectedInstance = instances.find(i => i.id === instanceId);
  const instancePhone = selectedInstance?.connected_phone;
  
  // Determine validation status for each instance
  const getInstanceStatus = (inst: typeof instances[0]) => {
    if (inst.id === groupInstanceId) return 'owner'; // Instance that imported/owns the group
    if (!inst.connected_phone || !memberPhones) return 'unknown';
    // Normalize phone for comparison (strip leading +)
    const normalizedPhone = inst.connected_phone.replace(/\D/g, '');
    const isMember = memberPhones.some(p => {
      const normalized = p.replace(/\D/g, '');
      return normalized === normalizedPhone || normalized.endsWith(normalizedPhone) || normalizedPhone.endsWith(normalized);
    });
    return isMember ? 'member' : 'not_member';
  };

  const currentStatus = instanceId && instanceId !== 'none' 
    ? getInstanceStatus(instances.find(i => i.id === instanceId)!) 
    : null;

  const isMismatch = currentStatus === 'not_member';
  const isOwner = currentStatus === 'owner';
  const isMember = currentStatus === 'member';
  const isUnknown = currentStatus === 'unknown';

  return (
    <div className="space-y-2">
      <Label>Instância WhatsApp</Label>
      <Select value={instanceId} onValueChange={onInstanceChange}>
        <SelectTrigger className={isMismatch ? 'border-destructive' : ''}>
          <Smartphone className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Selecione a instância" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Nenhuma (definir depois)</SelectItem>
          {instances.filter(i => i.is_connected).map((inst) => {
            const status = getInstanceStatus(inst);
            const statusIcon = status === 'owner' ? '✅' : status === 'member' ? '✅' : status === 'not_member' ? '⚠️' : '';
            return (
              <SelectItem key={inst.id} value={inst.id}>
                {inst.instance_name} {inst.connected_phone ? `(${inst.connected_phone})` : ''} {statusIcon}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {groupId && isOwner && (
        <p className="text-xs text-primary flex items-center gap-1">
          ✅ Esta instância é dona/administradora do grupo
        </p>
      )}
      {groupId && isMember && (
        <p className="text-xs text-primary flex items-center gap-1">
          ✅ O telefone desta instância é membro do grupo
        </p>
      )}
      {groupId && isUnknown && instanceId && instanceId !== 'none' && (
        <div className="flex items-start gap-2 p-2 rounded-md bg-muted border border-border">
          <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Não foi possível verificar se esta instância é membro do grupo (telefone não cadastrado). Verifique manualmente se o número está no grupo.
          </p>
        </div>
      )}
      {groupId && isMismatch && (
        <div className="flex items-start gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">
            O telefone desta instância ({instancePhone}) <strong>não é membro</strong> do grupo selecionado. A campanha não conseguirá enviar mensagens. Selecione uma instância que faça parte do grupo.
          </p>
        </div>
      )}
    </div>
  );
}
