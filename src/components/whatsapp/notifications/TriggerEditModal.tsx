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
import { Loader2, Settings, Clock, MessageSquare, Info, RotateCcw } from "lucide-react";
import { NotificationTrigger, TriggerSchedule, TRIGGER_TYPES, TEMPLATE_VARIABLES, TEMPLATE_VARIABLE_GROUPS, REALTIME_ONLY_TRIGGERS } from "@/hooks/useWhatsAppNotifications";
import { Zap } from "lucide-react";
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
    gestor: `⚠️ *Alerta CPA Alto*

Cliente: {cliente}
Campanha: {campanha}

📊 *Métricas Atuais:*
• CPA: R$ {cpa_atual} ({variacao_cpa})
• Investimento: R$ {investimento}
• Conversões: {conversoes}
• CTR: {ctr}%

🎯 Campanhas ativas: {campanhas_ativas}

📊 Dashboard: {link_dashboard}`,
    cliente: `⚠️ *Atenção - Performance de Campanha*

Olá {cliente}!

Identificamos que sua campanha "{campanha}" está com o custo por aquisição acima do esperado.

📊 *Resumo:*
• Investimento: R$ {investimento}
• Conversões: {conversoes}

Seu gestor já está analisando e tomando as medidas necessárias.

📊 Acompanhe: {link_dashboard}`,
  },
  low_balance: {
    gestor: `💰 *Alerta Saldo Baixo*

Cliente: {cliente}

🏦 *Situação da Conta:*
• Saldo atual: R$ {saldo}
• Gasto diário médio: R$ {gasto_diario}
• Dias restantes: {dias_restantes}

📊 *Performance Atual:*
• Investimento período: R$ {investimento}
• Conversões: {conversoes}
• CPA: R$ {cpa_atual}

⚠️ *Ação necessária:* solicitar recarga ao cliente`,
    cliente: `💰 *Saldo da Conta de Anúncios*

Olá {cliente}!

🏦 *Situação da Conta:*
• Saldo atual: R$ {saldo}
• Previsão: {dias_restantes} dias restantes

📊 *Sua Performance:*
• Investimento: R$ {investimento}
• Conversões: {conversoes}

Recomendamos fazer uma recarga para manter suas campanhas ativas sem interrupção.`,
  },
  disabled_account: {
    gestor: `🚨 *URGENTE - Conta Desabilitada*

Cliente: {cliente}
Data/Hora: {data} às {hora}

📊 *Último Status:*
• Campanhas ativas: {campanhas_ativas}
• Investimento período: R$ {investimento}
• Conversões: {conversoes}

❗ *Ação imediata necessária!*`,
    cliente: `🚨 *Atenção - Conta de Anúncios*

Olá {cliente}!

Identificamos um problema com sua conta de anúncios em {data} às {hora}.

Sua equipe de gestão já foi notificada e está trabalhando na solução.

Em caso de dúvidas, entre em contato conosco.`,
  },
  weekly_report: {
    gestor: `📅 *Relatório Semanal - {cliente}*

📆 Período: {periodo_inicio} a {periodo_fim}

💰 *Investimento:* R$ {investimento} ({variacao_investimento})

📈 *Resultados:*
• Conversões: {conversoes} ({variacao_conversoes})
• Impressões: {impressoes}
• Cliques: {cliques}
• Alcance: {alcance} ({variacao_alcance})

📉 *Indicadores:*
• CPL: R$ {cpa_atual} ({variacao_cpa})
• CPC: R$ {cpc}
• CPM: R$ {cpm}
• CTR: {ctr}% ({variacao_ctr})
• Frequência: {frequencia}

🏆 Melhor campanha: {melhor_campanha}
🎯 Campanhas ativas: {campanhas_ativas}

📊 Dashboard: {link_dashboard}`,
    cliente: `📅 *Seu Relatório Semanal*

Olá {cliente}!

📆 Período: {periodo_inicio} a {periodo_fim}

💰 *Investimento:* R$ {investimento}

📈 *Seus Resultados:*
• Conversões/Leads: {conversoes}
• Pessoas alcançadas: {alcance}
• Cliques no anúncio: {cliques}

📉 *Indicadores:*
• Custo por Lead: R$ {cpa_atual}
• Taxa de Cliques: {ctr}%

📊 Acesse seu dashboard completo: {link_dashboard}`,
  },
  monthly_report: {
    gestor: `📆 *Relatório Mensal - {cliente}*

📆 Período: {periodo_inicio} a {periodo_fim}

💰 *Investimento Total:* R$ {investimento} ({variacao_investimento})

📈 *Resultados do Mês:*
• Conversões: {conversoes} ({variacao_conversoes})
• Impressões: {impressoes}
• Cliques: {cliques}
• Alcance: {alcance} ({variacao_alcance})

📉 *Indicadores Médios:*
• CPL: R$ {cpa_atual} ({variacao_cpa})
• CPC: R$ {cpc}
• CPM: R$ {cpm}
• CTR: {ctr}% ({variacao_ctr})
• Frequência: {frequencia}

🏦 *Conta:*
• Saldo atual: R$ {saldo}
• Gasto diário médio: R$ {gasto_diario}
• Previsão: {dias_restantes} dias

🏆 Melhor campanha: {melhor_campanha}
🎯 Campanhas ativas: {campanhas_ativas}

📊 Dashboard: {link_dashboard}`,
    cliente: `📆 *Seu Relatório Mensal*

Olá {cliente}!

📆 Período: {periodo_inicio} a {periodo_fim}

💰 *Investimento Total:* R$ {investimento}

📈 *Seus Resultados do Mês:*
• Conversões/Leads: {conversoes}
• Pessoas alcançadas: {alcance}
• Cliques nos anúncios: {cliques}
• Impressões: {impressoes}

📉 *Indicadores:*
• Custo por Lead: R$ {cpa_atual}
• Taxa de Cliques: {ctr}%

🏦 *Sua Conta:*
• Saldo disponível: R$ {saldo}

📊 Acesse seu dashboard completo: {link_dashboard}`,
  },
  post_published: {
    gestor: `✅ *Post Publicado com Sucesso*

Cliente: {cliente}
Data/Hora: {data} às {hora}

📊 *Status da Conta:*
• Campanhas ativas: {campanhas_ativas}
• Saldo: R$ {saldo}`,
    cliente: `✅ *Conteúdo Publicado!*

Olá {cliente}!

Seu conteúdo foi publicado com sucesso em {data} às {hora}!

📊 Acompanhe os resultados: {link_dashboard}`,
  },
  post_failed: {
    gestor: `❌ *Falha na Publicação*

Cliente: {cliente}
Data/Hora: {data} às {hora}

📊 *Status da Conta:*
• Campanhas ativas: {campanhas_ativas}
• Saldo: R$ {saldo}

⚠️ Verificar e tentar novamente`,
    cliente: `⚠️ *Atenção - Publicação*

Olá {cliente}!

Tivemos um problema ao publicar seu conteúdo em {data} às {hora}.

Nossa equipe já está verificando e entrará em contato em breve.`,
  },
  presentation_summary: {
    gestor: `📊 *Resumo da Apresentação*

Cliente: {cliente}
Data: {data} às {hora}

📈 *Métricas do Período:*
• Investimento: R$ {investimento}
• Conversões: {conversoes}
• Alcance: {alcance}

📊 Dashboard: {link_dashboard}`,
    cliente: `📊 *Resumo da Reunião*

Olá {cliente}!

Segue o resumo da nossa reunião de apresentação de conteúdo realizada em {data}.

📈 *Resultados do período:*
• Investimento: R$ {investimento}
• Conversões: {conversoes}

📊 Dashboard: {link_dashboard}`,
  },
  custom: {
    gestor: `📢 *Notificação - {cliente}*

Data: {data} às {hora}

📊 *Métricas:*
• Investimento: R$ {investimento}
• Conversões: {conversoes}
• CTR: {ctr}%
• CPA: R$ {cpa_atual}

📊 Dashboard: {link_dashboard}`,
    cliente: `📢 *Notificação*

Olá {cliente}!

📊 *Seus Resultados:*
• Investimento: R$ {investimento}
• Conversões: {conversoes}

📊 Dashboard: {link_dashboard}`,
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

      // Force realtime frequency for event-based triggers
      if (REALTIME_ONLY_TRIGGERS.includes(triggerType)) {
        setFrequencyType('realtime');
      }
    }
  }, [triggerType, trigger]);

  // Check if current trigger type is realtime-only
  const isRealtimeOnlyTrigger = REALTIME_ONLY_TRIGGERS.includes(triggerType);

  const handleSave = () => {
    // Force realtime for event-based triggers
    const effectiveFrequencyType = isRealtimeOnlyTrigger ? 'realtime' : frequencyType;
    
    onSave({
      trigger: {
        trigger_type: triggerType,
        trigger_name: triggerName,
        description,
        is_active: isActive,
        conditions,
      },
      schedule: {
        frequency_type: effectiveFrequencyType,
        times_per_day: isRealtimeOnlyTrigger ? 1 : timesPerDay,
        execution_hours: isRealtimeOnlyTrigger ? [] : executionHours,
        days_of_week: isRealtimeOnlyTrigger ? [] : daysOfWeek,
        day_of_month: isRealtimeOnlyTrigger ? null : dayOfMonth,
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
            {isRealtimeOnlyTrigger ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-emerald-100 dark:bg-emerald-950 mb-4">
                  <Zap className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Gatilho em Tempo Real</h3>
                <p className="text-muted-foreground max-w-md mb-4">
                  Este tipo de gatilho é acionado automaticamente quando o evento ocorre. 
                  Não é necessário configurar agendamento.
                </p>
                <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950">
                  ⚡ Execução Instantânea
                </Badge>
                <p className="text-xs text-muted-foreground mt-4">
                  A mensagem será enviada imediatamente quando: {TRIGGER_TYPES.find(t => t.value === triggerType)?.description?.toLowerCase()}
                </p>
              </div>
            ) : (
              <>
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
              </>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4 mt-4">
            {/* Template Selector */}
            <div className="p-4 border rounded-lg bg-card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-base">Carregar Template Pronto</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Selecione um modelo pré-configurado para este tipo de gatilho
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const defaults = DEFAULT_TEMPLATES[triggerType as keyof typeof DEFAULT_TEMPLATES];
                    if (defaults) {
                      setGestorTemplate(defaults.gestor);
                      setClienteTemplate(defaults.cliente);
                    }
                  }}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Restaurar Padrão
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3 px-4"
                  onClick={() => {
                    const defaults = DEFAULT_TEMPLATES[triggerType as keyof typeof DEFAULT_TEMPLATES];
                    if (defaults) {
                      setGestorTemplate(defaults.gestor);
                      setClienteTemplate(defaults.cliente);
                    }
                  }}
                >
                  <div className="text-left">
                    <div className="font-medium">📊 Completo</div>
                    <div className="text-xs text-muted-foreground">Todas as métricas e variações</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3 px-4"
                  onClick={() => {
                    // Simplified templates
                    const simplified: Record<string, { gestor: string; cliente: string }> = {
                      high_cpa: {
                        gestor: `⚠️ *CPA Alto - {cliente}*\n\n• CPA: R$ {cpa_atual}\n• Conversões: {conversoes}\n• Investimento: R$ {investimento}\n\n📊 {link_dashboard}`,
                        cliente: `⚠️ Olá {cliente}!\n\nSua campanha precisa de atenção.\n\n📊 Acompanhe: {link_dashboard}`,
                      },
                      low_balance: {
                        gestor: `💰 *Saldo Baixo - {cliente}*\n\n• Saldo: R$ {saldo}\n• Dias restantes: {dias_restantes}\n\n⚠️ Solicitar recarga`,
                        cliente: `💰 Olá {cliente}!\n\nSeu saldo está em R$ {saldo}.\nPrevisão: {dias_restantes} dias.\n\nRecomendamos recarregar.`,
                      },
                      disabled_account: {
                        gestor: `🚨 *Conta Desabilitada - {cliente}*\n\n{data} às {hora}\n\n❗ Ação imediata`,
                        cliente: `🚨 Olá {cliente}!\n\nIdentificamos um problema com sua conta.\nJá estamos trabalhando nisso.`,
                      },
                      weekly_report: {
                        gestor: `📅 *Semanal - {cliente}*\n\n💰 R$ {investimento}\n📈 {conversoes} conversões\n📊 CTR: {ctr}%\n\n{link_dashboard}`,
                        cliente: `📅 Olá {cliente}!\n\n💰 Investimento: R$ {investimento}\n📈 Conversões: {conversoes}\n\n📊 {link_dashboard}`,
                      },
                      monthly_report: {
                        gestor: `📆 *Mensal - {cliente}*\n\n💰 R$ {investimento} ({variacao_investimento})\n📈 {conversoes} conversões ({variacao_conversoes})\n\n{link_dashboard}`,
                        cliente: `📆 Olá {cliente}!\n\n💰 Investimento: R$ {investimento}\n📈 Conversões: {conversoes}\n\n📊 {link_dashboard}`,
                      },
                      post_published: {
                        gestor: `✅ Post publicado - {cliente}\n{data} às {hora}`,
                        cliente: `✅ Olá {cliente}!\n\nSeu conteúdo foi publicado!`,
                      },
                      post_failed: {
                        gestor: `❌ Falha na publicação - {cliente}\n{data} às {hora}`,
                        cliente: `⚠️ Olá {cliente}!\n\nTivemos um problema. Estamos verificando.`,
                      },
                      presentation_summary: {
                        gestor: `📊 Apresentação - {cliente}\n{data}\n\n📊 {link_dashboard}`,
                        cliente: `📊 Olá {cliente}!\n\nResumo da reunião disponível.\n\n📊 {link_dashboard}`,
                      },
                      custom: {
                        gestor: `📢 {cliente}\n{data}\n\n📊 {link_dashboard}`,
                        cliente: `📢 Olá {cliente}!\n\n📊 {link_dashboard}`,
                      },
                    };
                    const tpl = simplified[triggerType];
                    if (tpl) {
                      setGestorTemplate(tpl.gestor);
                      setClienteTemplate(tpl.cliente);
                    }
                  }}
                >
                  <div className="text-left">
                    <div className="font-medium">📝 Resumido</div>
                    <div className="text-xs text-muted-foreground">Apenas informações essenciais</div>
                  </div>
                </Button>
              </div>
            </div>

            {/* Variable Groups */}
            <div className="p-4 border rounded-lg bg-muted/50 max-h-[180px] overflow-y-auto">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Variáveis Disponíveis</span>
                <span className="text-xs text-muted-foreground">(clique para copiar)</span>
              </div>
              <div className="space-y-3">
                <TooltipProvider>
                  {TEMPLATE_VARIABLE_GROUPS.map((group) => (
                    <div key={group.name}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-sm">{group.icon}</span>
                        <span className="text-xs font-medium text-muted-foreground">{group.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {group.variables.map((v) => (
                          <Tooltip key={v.variable}>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="secondary"
                                className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                                onClick={() => navigator.clipboard.writeText(v.variable)}
                              >
                                {v.variable}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[200px]">
                              <p>{v.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  ))}
                </TooltipProvider>
              </div>
            </div>

            {/* Gestor Template */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Mensagem para Gestor</Label>
                <div className="flex gap-1 flex-wrap justify-end max-w-[60%]">
                  {['{cliente}', '{investimento}', '{conversoes}', '{cpa_atual}', '{link_dashboard}'].map((v) => (
                    <Button
                      key={v}
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => insertVariable(v, 'gestor')}
                    >
                      {v}
                    </Button>
                  ))}
                </div>
              </div>
              <Textarea
                value={gestorTemplate}
                onChange={(e) => setGestorTemplate(e.target.value)}
                placeholder="Mensagem para gestores..."
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            {/* Cliente Template */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Mensagem para Cliente</Label>
                <div className="flex gap-1 flex-wrap justify-end max-w-[60%]">
                  {['{cliente}', '{investimento}', '{conversoes}', '{ctr}', '{link_dashboard}'].map((v) => (
                    <Button
                      key={v}
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => insertVariable(v, 'cliente')}
                    >
                      {v}
                    </Button>
                  ))}
                </div>
              </div>
              <Textarea
                value={clienteTemplate}
                onChange={(e) => setClienteTemplate(e.target.value)}
                placeholder="Mensagem para clientes..."
                rows={8}
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
