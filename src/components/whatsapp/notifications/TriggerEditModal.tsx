import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Settings, Clock, MessageSquare, Info } from "lucide-react";
import { NotificationTrigger, TriggerSchedule, TRIGGER_TYPES, TEMPLATE_VARIABLES } from "@/hooks/useWhatsAppNotifications";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TriggerEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: NotificationTrigger | null;
  onSave: (data: any) => void;
  isSaving: boolean;
}

const DEFAULT_TEMPLATES = {
  high_cpa: {
    gestor: '⚠️ *Alerta CPA Alto*\n\nCliente: {cliente}\nCampanha: {campanha}\nCPA Atual: R$ {cpa_atual}\nCPA Meta: R$ {cpa_meta}\nVariação: {variacao_cpa}%\n\n📊 Dashboard: {link_dashboard}',
    cliente: '⚠️ *Atenção - Performance de Campanha*\n\nOlá! Identificamos que sua campanha "{campanha}" está com o custo por aquisição acima do esperado.\n\nSeu gestor já está analisando e tomando as medidas necessárias.\n\n📊 Acompanhe: {link_dashboard}',
  },
  low_balance: {
    gestor: '💰 *Alerta Saldo Baixo*\n\nCliente: {cliente}\nSaldo: R$ {saldo}\nGasto Diário: R$ {gasto_diario}\nDias Restantes: {dias_restantes}\n\n⚠️ Ação necessária: solicitar recarga',
    cliente: '💰 *Saldo da Conta de Anúncios*\n\nOlá {cliente}!\n\nSeu saldo está em R$ {saldo} e pode durar aproximadamente {dias_restantes} dias.\n\nRecomendamos fazer uma recarga para manter suas campanhas ativas.',
  },
  disabled_account: {
    gestor: '🚨 *URGENTE - Conta Desabilitada*\n\nCliente: {cliente}\nData: {data} às {hora}\n\n❗ Ação imediata necessária',
    cliente: '🚨 *Atenção - Conta de Anúncios*\n\nOlá {cliente}!\n\nIdentificamos um problema com sua conta de anúncios. Sua equipe de gestão já foi notificada e está trabalhando na solução.',
  },
  weekly_report: {
    gestor: '📅 *Relatório Semanal*\n\nCliente: {cliente}\nPeríodo: Última semana\n\n📊 Dashboard: {link_dashboard}',
    cliente: '📅 *Seu Relatório Semanal*\n\nOlá {cliente}!\n\nSeu relatório semanal está disponível.\n\n📊 Acesse: {link_dashboard}',
  },
  monthly_report: {
    gestor: '📆 *Relatório Mensal*\n\nCliente: {cliente}\nPeríodo: Último mês\n\n📊 Dashboard: {link_dashboard}',
    cliente: '📆 *Seu Relatório Mensal*\n\nOlá {cliente}!\n\nSeu relatório mensal consolidado está disponível.\n\n📊 Acesse: {link_dashboard}',
  },
  post_published: {
    gestor: '✅ *Post Publicado*\n\nCliente: {cliente}\nData: {data} às {hora}',
    cliente: '✅ *Conteúdo Publicado!*\n\nOlá {cliente}!\n\nSeu conteúdo foi publicado com sucesso!',
  },
  post_failed: {
    gestor: '❌ *Falha na Publicação*\n\nCliente: {cliente}\nData: {data} às {hora}\n\n⚠️ Verificar e tentar novamente',
    cliente: '⚠️ *Atenção - Publicação*\n\nOlá {cliente}!\n\nTivemos um problema ao publicar seu conteúdo. Nossa equipe já está verificando.',
  },
  presentation_summary: {
    gestor: '📊 *Resumo da Apresentação*\n\nCliente: {cliente}\nData: {data}',
    cliente: '📊 *Resumo da Reunião*\n\nOlá {cliente}!\n\nSegue o resumo da nossa reunião de apresentação de conteúdo.',
  },
  custom: {
    gestor: 'Mensagem para o gestor...',
    cliente: 'Mensagem para o cliente...',
  },
};

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function TriggerEditModal({
  open,
  onOpenChange,
  trigger,
  onSave,
  isSaving,
}: TriggerEditModalProps) {
  const [activeTab, setActiveTab] = useState("config");
  
  // Trigger config
  const [triggerType, setTriggerType] = useState('high_cpa');
  const [triggerName, setTriggerName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [conditions, setConditions] = useState<Record<string, any>>({});

  // Schedule config
  const [frequencyType, setFrequencyType] = useState<TriggerSchedule['frequency_type']>('daily');
  const [timesPerDay, setTimesPerDay] = useState(1);
  const [executionHours, setExecutionHours] = useState<number[]>([9]);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [respectQuietHours, setRespectQuietHours] = useState(true);

  // Templates
  const [gestorTemplate, setGestorTemplate] = useState('');
  const [clienteTemplate, setClienteTemplate] = useState('');

  // Initialize form
  useEffect(() => {
    if (trigger) {
      setTriggerType(trigger.trigger_type);
      setTriggerName(trigger.trigger_name);
      setDescription(trigger.description || '');
      setIsActive(trigger.is_active);
      setConditions(trigger.conditions);

      if (trigger.schedule) {
        setFrequencyType(trigger.schedule.frequency_type);
        setTimesPerDay(trigger.schedule.times_per_day || 1);
        setExecutionHours(trigger.schedule.execution_hours || [9]);
        setDaysOfWeek(trigger.schedule.days_of_week || [1, 2, 3, 4, 5]);
        setDayOfMonth(trigger.schedule.day_of_month || 1);
        setRespectQuietHours(trigger.schedule.respect_quiet_hours);
      }

      const gestorTpl = trigger.templates?.find(t => t.recipient_profile === 'gestor');
      const clienteTpl = trigger.templates?.find(t => t.recipient_profile === 'cliente');
      setGestorTemplate(gestorTpl?.message_template || '');
      setClienteTemplate(clienteTpl?.message_template || '');
    } else {
      // Reset form for new trigger
      setTriggerType('high_cpa');
      setTriggerName('');
      setDescription('');
      setIsActive(true);
      setConditions({});
      setFrequencyType('daily');
      setTimesPerDay(1);
      setExecutionHours([9]);
      setDaysOfWeek([1, 2, 3, 4, 5]);
      setDayOfMonth(1);
      setRespectQuietHours(true);
      setGestorTemplate(DEFAULT_TEMPLATES.high_cpa.gestor);
      setClienteTemplate(DEFAULT_TEMPLATES.high_cpa.cliente);
    }
    setActiveTab("config");
  }, [trigger, open]);

  // Update templates when trigger type changes (only for new triggers)
  useEffect(() => {
    if (!trigger && triggerType) {
      const defaults = DEFAULT_TEMPLATES[triggerType as keyof typeof DEFAULT_TEMPLATES];
      if (defaults) {
        setGestorTemplate(defaults.gestor);
        setClienteTemplate(defaults.cliente);
      }
      
      // Auto-generate name
      const type = TRIGGER_TYPES.find(t => t.value === triggerType);
      if (type && !triggerName) {
        setTriggerName(type.label);
      }
    }
  }, [triggerType, trigger]);

  const handleSave = () => {
    onSave({
      trigger: {
        trigger_type: triggerType,
        trigger_name: triggerName,
        description,
        is_active: isActive,
        conditions,
      },
      schedule: {
        frequency_type: frequencyType,
        times_per_day: timesPerDay,
        execution_hours: executionHours,
        days_of_week: daysOfWeek,
        day_of_month: dayOfMonth,
        respect_quiet_hours: respectQuietHours,
      },
      templates: {
        gestor: gestorTemplate,
        cliente: clienteTemplate,
      },
    });
  };

  const handleHourToggle = (hour: number) => {
    setExecutionHours(prev => 
      prev.includes(hour) 
        ? prev.filter(h => h !== hour)
        : [...prev, hour].sort((a, b) => a - b)
    );
  };

  const handleDayToggle = (day: number) => {
    setDaysOfWeek(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    );
  };

  const insertVariable = (variable: string, target: 'gestor' | 'cliente') => {
    if (target === 'gestor') {
      setGestorTemplate(prev => prev + variable);
    } else {
      setClienteTemplate(prev => prev + variable);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {trigger ? 'Editar Gatilho' : 'Novo Gatilho'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuração
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Agendamento
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Mensagens
            </TabsTrigger>
          </TabsList>

          {/* Config Tab */}
          <TabsContent value="config" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Tipo de Gatilho</Label>
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {TRIGGER_TYPES.find(t => t.value === triggerType)?.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Nome do Gatilho</Label>
              <Input
                value={triggerName}
                onChange={(e) => setTriggerName(e.target.value)}
                placeholder="Ex: Alerta CPA Alto"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição do gatilho..."
                rows={2}
              />
            </div>

            {/* Condition fields based on trigger type */}
            {triggerType === 'high_cpa' && (
              <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                <Label>Condições</Label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm">Variação CPA (%)</Label>
                    <Input
                      type="number"
                      value={conditions.cpa_threshold_percentage || 50}
                      onChange={(e) => setConditions({ ...conditions, cpa_threshold_percentage: Number(e.target.value) })}
                      placeholder="50"
                    />
                    <p className="text-xs text-muted-foreground">Alertar quando CPA estiver X% acima da meta</p>
                  </div>
                </div>
              </div>
            )}

            {triggerType === 'low_balance' && (
              <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                <Label>Condições</Label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm">Dias de saldo restante</Label>
                    <Input
                      type="number"
                      value={conditions.balance_threshold_days || 2}
                      onChange={(e) => setConditions({ ...conditions, balance_threshold_days: Number(e.target.value) })}
                      placeholder="2"
                    />
                    <p className="text-xs text-muted-foreground">Alertar quando saldo durar menos de X dias</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label>Gatilho Ativo</Label>
                <p className="text-xs text-muted-foreground">Ativar ou desativar este gatilho</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select value={frequencyType} onValueChange={(v) => setFrequencyType(v as TriggerSchedule['frequency_type'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Tempo Real</SelectItem>
                  <SelectItem value="hourly">A Cada Hora</SelectItem>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {frequencyType === 'daily' && (
              <>
                <div className="space-y-2">
                  <Label>Quantas vezes por dia?</Label>
                  <Select value={String(timesPerDay)} onValueChange={(v) => setTimesPerDay(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 6, 8, 12, 24].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}x por dia</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Horários de execução</Label>
                  <div className="flex flex-wrap gap-2">
                    {HOURS.map((hour) => (
                      <Badge
                        key={hour}
                        variant={executionHours.includes(hour) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleHourToggle(hour)}
                      >
                        {String(hour).padStart(2, '0')}h
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selecionados: {executionHours.map(h => `${h}h`).join(', ') || 'Nenhum'}
                  </p>
                </div>
              </>
            )}

            {frequencyType === 'weekly' && (
              <>
                <div className="space-y-2">
                  <Label>Dias da Semana</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <Badge
                        key={day.value}
                        variant={daysOfWeek.includes(day.value) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleDayToggle(day.value)}
                      >
                        {day.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Horário</Label>
                  <Select value={String(executionHours[0] || 9)} onValueChange={(v) => setExecutionHours([Number(v)])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map((hour) => (
                        <SelectItem key={hour} value={String(hour)}>
                          {String(hour).padStart(2, '0')}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {frequencyType === 'monthly' && (
              <>
                <div className="space-y-2">
                  <Label>Dia do Mês</Label>
                  <Select value={String(dayOfMonth)} onValueChange={(v) => setDayOfMonth(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={String(day)}>Dia {day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Horário</Label>
                  <Select value={String(executionHours[0] || 9)} onValueChange={(v) => setExecutionHours([Number(v)])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map((hour) => (
                        <SelectItem key={hour} value={String(hour)}>
                          {String(hour).padStart(2, '0')}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label>Respeitar Horário de Silêncio</Label>
                <p className="text-xs text-muted-foreground">Não enviar durante horário configurado</p>
              </div>
              <Switch checked={respectQuietHours} onCheckedChange={setRespectQuietHours} />
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4 mt-4">
            <div className="p-3 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Variáveis Disponíveis</span>
              </div>
              <div className="flex flex-wrap gap-1">
                <TooltipProvider>
                  {TEMPLATE_VARIABLES.map((v) => (
                    <Tooltip key={v.variable}>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="text-xs cursor-help">
                          {v.variable}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>{v.description}</TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Mensagem para Gestor</Label>
                <div className="flex gap-1">
                  {TEMPLATE_VARIABLES.slice(0, 5).map((v) => (
                    <Button
                      key={v.variable}
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => insertVariable(v.variable, 'gestor')}
                    >
                      {v.variable}
                    </Button>
                  ))}
                </div>
              </div>
              <Textarea
                value={gestorTemplate}
                onChange={(e) => setGestorTemplate(e.target.value)}
                placeholder="Mensagem para gestores..."
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Mensagem para Cliente</Label>
                <div className="flex gap-1">
                  {TEMPLATE_VARIABLES.slice(0, 5).map((v) => (
                    <Button
                      key={v.variable}
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => insertVariable(v.variable, 'cliente')}
                    >
                      {v.variable}
                    </Button>
                  ))}
                </div>
              </div>
              <Textarea
                value={clienteTemplate}
                onChange={(e) => setClienteTemplate(e.target.value)}
                placeholder="Mensagem para clientes..."
                rows={6}
                className="font-mono text-sm"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !triggerName}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {trigger ? 'Salvar Alterações' : 'Criar Gatilho'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
