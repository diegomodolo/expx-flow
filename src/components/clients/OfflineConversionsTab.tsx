import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useOfflineConversions } from "@/hooks/useOfflineConversions";
import { Loader2, CheckCircle, XCircle, Clock, ExternalLink, FileJson, UserPlus, CheckCircle2, Calendar, FileText, DollarSign, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ConfigureOfflineEventSetDialog } from "./ConfigureOfflineEventSetDialog";
import { WebhookIntegrationCard } from "./WebhookIntegrationCard";
import { ConversionDetailsModal } from "./ConversionDetailsModal";
import { QuickEventButtons } from "./QuickEventButtons";
import type { OfflineConversion } from "@/hooks/useOfflineConversions";
import { EVENT_PRESETS, EventPresetKey, getEventConfig } from "@/lib/offlineEventPresets";

interface OfflineConversionsTabProps {
  clientId: string;
}

export const OfflineConversionsTab = ({ clientId }: OfflineConversionsTabProps) => {
  const [selectedEventPreset, setSelectedEventPreset] = useState<EventPresetKey>('PURCHASE');
  const [leadId, setLeadId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [value, setValue] = useState('');
  const [pipelineStage, setPipelineStage] = useState('');
  const [disqualificationReason, setDisqualificationReason] = useState('');
  const [fbc, setFbc] = useState('');
  const [fbp, setFbp] = useState('');
  const [customEventName, setCustomEventName] = useState('');
  const [selectedConversion, setSelectedConversion] = useState<OfflineConversion | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const { conversions, isLoading, sendConversion, isSending, refetch } = useOfflineConversions(clientId);

  const selectedPreset = EVENT_PRESETS[selectedEventPreset];
  const requiresValue = 'requiresValue' in selectedPreset && selectedPreset.requiresValue;
  const requiresReason = 'requiresReason' in selectedPreset && selectedPreset.requiresReason;
  const isCustomEvent = selectedEventPreset === 'CUSTOM';

  const handleQuickAction = (eventKey: EventPresetKey) => {
    setSelectedEventPreset(eventKey);
    // Scroll to form
    const formElement = document.getElementById('conversion-form');
    formElement?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendConversion = async () => {
    if (!email && !phone) {
      alert('Informe pelo menos o email ou telefone do cliente.');
      return;
    }

    if (requiresReason && !disqualificationReason) {
      alert('Por favor, informe o motivo da desqualificação.');
      return;
    }

    if (requiresValue && !value) {
      alert('Por favor, informe o valor da conversão.');
      return;
    }

    try {
      const eventName = isCustomEvent && customEventName 
        ? customEventName 
        : selectedPreset.name;

      await sendConversion({
        clientId,
        leadId: leadId || undefined,
        eventName,
        value: parseFloat(value) || undefined,
        currency: 'BRL',
        actionSource: selectedPreset.actionSource,
        userData: {
          email: email || undefined,
          phone: phone || undefined,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          fbc: fbc || undefined,
          fbp: fbp || undefined,
        },
        customData: {
          ...(leadId && { lead_id: leadId }),
          ...(pipelineStage && { pipeline_stage: pipelineStage }),
          ...(disqualificationReason && { disqualification_reason: disqualificationReason }),
        },
      });

      // Limpar formulário
      setLeadId('');
      setEmail('');
      setPhone('');
      setFirstName('');
      setLastName('');
      setValue('');
      setPipelineStage('');
      setDisqualificationReason('');
      setFbc('');
      setFbp('');
      setCustomEventName('');
    } catch (err) {
      console.error('Error sending conversion:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Enviado</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Erro</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEventIcon = (eventName: string) => {
    const config = getEventConfig(eventName);
    switch (config.icon) {
      case 'UserPlus': return <UserPlus className="w-4 h-4" />;
      case 'CheckCircle': return <CheckCircle2 className="w-4 h-4" />;
      case 'Calendar': return <Calendar className="w-4 h-4" />;
      case 'FileText': return <FileText className="w-4 h-4" />;
      case 'DollarSign': return <DollarSign className="w-4 h-4" />;
      case 'UserX': return <UserX className="w-4 h-4" />;
      default: return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  // Agrupar conversões por lead_id para mostrar timeline
  const conversionsByLead = conversions.reduce((acc, conv) => {
    const leadIdValue = conv.webhook_payload?.leadId || conv.custom_data?.lead_id || 'sem-lead-id';
    if (!acc[leadIdValue]) {
      acc[leadIdValue] = [];
    }
    acc[leadIdValue].push(conv);
    return acc;
  }, {} as Record<string, OfflineConversion[]>);

  return (
    <div className="space-y-6">
      <WebhookIntegrationCard clientId={clientId} />
      
      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">📊 Sistema de Timeline de Eventos</CardTitle>
          <CardDescription className="text-blue-700">
            Rastreie toda a jornada do lead: Lead → Qualificado → Reunião → Compra. O Meta usa esses dados para otimizar campanhas e criar públicos inteligentes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <ConfigureOfflineEventSetDialog clientId={clientId} />
            <Button variant="outline" size="sm" asChild>
              <a href="https://business.facebook.com/events_manager2" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir Events Manager
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Action Buttons */}
      <div>
        <h3 className="text-lg font-semibold mb-4">🎯 Ações Rápidas</h3>
        <QuickEventButtons onEventClick={handleQuickAction} />
      </div>

      {/* Form Card */}
      <Card id="conversion-form">
        <CardHeader>
          <CardTitle>Registrar Evento de Conversão</CardTitle>
          <CardDescription>
            Selecione o tipo de evento e preencha os dados. Use o mesmo Lead ID para rastrear a jornada completa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="eventType">Tipo de Evento *</Label>
              <Select value={selectedEventPreset} onValueChange={(v) => setSelectedEventPreset(v as EventPresetKey)}>
                <SelectTrigger id="eventType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_PRESETS).map(([key, preset]) => (
                    <SelectItem key={key} value={key}>
                      {preset.displayName} - {preset.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {('metaOptimizable' in selectedPreset && selectedPreset.metaOptimizable) && (
                <p className="text-xs text-green-600">✓ Este evento pode ser usado para otimizar campanhas no Meta</p>
              )}
              {('isNegativeSignal' in selectedPreset && selectedPreset.isNegativeSignal) && (
                <p className="text-xs text-orange-600">⚠ Evento negativo - usado para públicos de exclusão</p>
              )}
            </div>

            {isCustomEvent && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="customEventName">Nome do Evento Personalizado *</Label>
                <Input 
                  id="customEventName"
                  value={customEventName} 
                  onChange={(e) => setCustomEventName(e.target.value)} 
                  placeholder="MeuEventoCustomizado" 
                />
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="leadId">Lead ID (Recomendado)</Label>
              <Input 
                id="leadId"
                value={leadId} 
                onChange={(e) => setLeadId(e.target.value)} 
                placeholder="12345" 
              />
              <p className="text-xs text-muted-foreground">Use o mesmo ID em todos os eventos do mesmo lead para rastreamento</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email do Cliente *</Label>
              <Input 
                id="email"
                type="email"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="cliente@email.com" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone do Cliente</Label>
              <Input 
                id="phone"
                type="tel"
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="(11) 99999-9999" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName">Primeiro Nome</Label>
              <Input 
                id="firstName"
                value={firstName} 
                onChange={(e) => setFirstName(e.target.value)} 
                placeholder="João" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Sobrenome</Label>
              <Input 
                id="lastName"
                value={lastName} 
                onChange={(e) => setLastName(e.target.value)} 
                placeholder="Silva" 
              />
            </div>

            {requiresValue && (
              <div className="space-y-2">
                <Label htmlFor="value">Valor (R$) *</Label>
                <Input 
                  id="value"
                  type="number"
                  step="0.01"
                  value={value} 
                  onChange={(e) => setValue(e.target.value)} 
                  placeholder="199.90" 
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="pipelineStage">Pipeline Stage</Label>
              <Input 
                id="pipelineStage"
                value={pipelineStage} 
                onChange={(e) => setPipelineStage(e.target.value)} 
                placeholder="MQL, SQL, Negociação..." 
              />
            </div>

            {requiresReason && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="disqualificationReason">Motivo da Desqualificação *</Label>
                <Textarea 
                  id="disqualificationReason"
                  value={disqualificationReason} 
                  onChange={(e) => setDisqualificationReason(e.target.value)} 
                  placeholder="Ex: Segmento fora do foco, ticket muito baixo, sem CNPJ..."
                  rows={3}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fbc">Cookie _fbc (opcional)</Label>
              <Input 
                id="fbc"
                value={fbc} 
                onChange={(e) => setFbc(e.target.value)} 
                placeholder="fb.1.1731100000.ABCDEF" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fbp">Cookie _fbp (opcional)</Label>
              <Input 
                id="fbp"
                value={fbp} 
                onChange={(e) => setFbp(e.target.value)} 
                placeholder="fb.1.1720000000.1234567890" 
              />
            </div>
          </div>
          <Button onClick={handleSendConversion} disabled={isSending || (!email && !phone)} className="w-full">
            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enviar {selectedPreset.displayName} para o Meta
          </Button>
        </CardContent>
      </Card>

      {/* History Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Timeline de Eventos</CardTitle>
              <CardDescription>
                Acompanhe todos os eventos enviados, organizados por lead
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <Loader2 className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : conversions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma conversão registrada ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead ID</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversions.map((conversion) => {
                    const leadIdValue = conversion.webhook_payload?.leadId || conversion.custom_data?.lead_id || '-';
                    return (
                      <TableRow key={conversion.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {leadIdValue}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(conversion.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getEventIcon(conversion.event_name)}
                            <span>{conversion.event_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {conversion.value ? `R$ ${conversion.value.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(conversion.status)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {conversion.source === 'webhook' ? '🔗 Webhook' : '✋ Manual'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedConversion(conversion);
                              setIsDetailsModalOpen(true);
                            }}
                          >
                            <FileJson className="w-4 h-4 mr-2" />
                            Ver Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedConversion && (
        <ConversionDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedConversion(null);
          }}
          conversion={selectedConversion}
        />
      )}
    </div>
  );
};
