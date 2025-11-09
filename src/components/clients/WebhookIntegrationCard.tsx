import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, RefreshCw, TestTube, Link2, Code, CheckCircle, XCircle, Calendar, FileText, DollarSign, UserPlus, UserX, Zap, Settings } from "lucide-react";
import { useWebhookTokens } from "@/hooks/useWebhookTokens";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { EVENT_PRESETS, type EventPresetKey } from "@/lib/offlineEventPresets";

interface WebhookIntegrationCardProps {
  clientId: string;
}

export const WebhookIntegrationCard = ({ clientId }: WebhookIntegrationCardProps) => {
  const { toast } = useToast();
  const [showDocs, setShowDocs] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventPresetKey>("LEAD_QUALIFIED");
  const {
    token,
    isLoading,
    generateToken,
    isGenerating,
    regenerateToken,
    isRegenerating,
    testWebhook,
    isTesting,
    getWebhookUrl,
  } = useWebhookTokens(clientId);

  const webhookUrl = token ? getWebhookUrl(token.token) : null;

  const getEventIcon = (eventKey: EventPresetKey) => {
    const iconMap = {
      LEAD_CREATED: UserPlus,
      LEAD_QUALIFIED: CheckCircle,
      MEETING_SCHEDULED: Calendar,
      PROPOSAL_SENT: FileText,
      PURCHASE: DollarSign,
      LEAD_DISQUALIFIED: UserX,
      CUSTOM: Settings,
    };
    return iconMap[eventKey] || Settings;
  };

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: message,
    });
  };

  const handleTestWebhook = () => {
    if (token) {
      testWebhook(token.token);
    }
  };

  const getExamplePayload = (eventKey: EventPresetKey) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const preset = EVENT_PRESETS[eventKey];
    
    const basePayload = {
      leadId: "lead_12345",
      eventName: preset.name,
      eventTime: timestamp,
      actionSource: preset.actionSource,
      userData: {
        email: "lead@empresa.com",
        phone: "+5521999999999",
        firstName: "João",
        lastName: "Silva",
        city: "Rio de Janeiro",
        state: "RJ",
        country: "BR",
      },
    };

    switch (eventKey) {
      case "PURCHASE":
        return {
          ...basePayload,
          value: 5500.0,
          currency: "BRL",
          customData: {
            lead_id: "lead_12345",
            pipeline_stage: "Closed Won",
            contract_id: "CONT-2024-042",
            crm_source: "Pipedrive",
          },
        };
      case "LEAD_DISQUALIFIED":
        return {
          ...basePayload,
          customData: {
            lead_id: "lead_12345",
            pipeline_stage: "Discarded",
            disqualification_reason: "Segmento fora do foco",
            crm_source: "Pipedrive",
          },
        };
      case "LEAD_QUALIFIED":
        return {
          ...basePayload,
          customData: {
            lead_id: "lead_12345",
            pipeline_stage: "MQL",
            segment: "Software House > ERP Contábil",
            crm_source: "Pipedrive",
          },
        };
      case "MEETING_SCHEDULED":
        return {
          ...basePayload,
          customData: {
            lead_id: "lead_12345",
            pipeline_stage: "SQL",
            meeting_date: "2024-11-15T14:00:00Z",
            meeting_type: "Demo do produto",
            crm_source: "Pipedrive",
          },
        };
      case "PROPOSAL_SENT":
        return {
          ...basePayload,
          customData: {
            lead_id: "lead_12345",
            pipeline_stage: "Proposal",
            proposal_value: 5500.0,
            proposal_id: "PROP-2024-001",
            crm_source: "Pipedrive",
          },
        };
      default:
        return {
          ...basePayload,
          customData: {
            lead_id: "lead_12345",
            pipeline_stage: "New",
            crm_source: "Pipedrive",
          },
        };
    }
  };

  const getCurlExample = (eventKey: EventPresetKey) => {
    if (!webhookUrl) return '';
    const payload = getExamplePayload(eventKey);
    return `curl -X POST '${webhookUrl}' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify(payload, null, 2)}'`;
  };

  const getJsExample = (eventKey: EventPresetKey) => {
    if (!webhookUrl) return '';
    const preset = EVENT_PRESETS[eventKey];
    return `// Integração JavaScript/Node.js
const webhookUrl = '${webhookUrl}';

async function send${preset.name}(leadData) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      leadId: leadData.id,
      eventName: '${preset.name}',
      actionSource: '${preset.actionSource}',${eventKey === "PURCHASE" ? `
      value: leadData.value,
      currency: 'BRL',` : ''}
      userData: {
        email: leadData.email,
        phone: leadData.phone,
        firstName: leadData.firstName,
        lastName: leadData.lastName
      },
      customData: {
        lead_id: leadData.id,
        pipeline_stage: '${eventKey === "LEAD_QUALIFIED" ? "MQL" : eventKey === "MEETING_SCHEDULED" ? "SQL" : eventKey === "PURCHASE" ? "Closed Won" : eventKey === "LEAD_DISQUALIFIED" ? "Discarded" : "New"}',${eventKey === "LEAD_DISQUALIFIED" ? `
        disqualification_reason: leadData.reason,` : ''}
        crm_source: 'Pipedrive'
      }
    })
  });
  
  return await response.json();
}`;
  };

  const getPythonExample = (eventKey: EventPresetKey) => {
    if (!webhookUrl) return '';
    const preset = EVENT_PRESETS[eventKey];
    return `# Integração Python
import requests
import json

def send_${preset.name.toLowerCase()}(lead_data):
    webhook_url = "${webhookUrl}"
    
    payload = {
        "leadId": lead_data["id"],
        "eventName": "${preset.name}",
        "actionSource": "${preset.actionSource}",${eventKey === "PURCHASE" ? `
        "value": lead_data["value"],
        "currency": "BRL",` : ''}
        "userData": {
            "email": lead_data["email"],
            "phone": lead_data["phone"],
            "firstName": lead_data["first_name"],
            "lastName": lead_data["last_name"]
        },
        "customData": {
            "lead_id": lead_data["id"],
            "pipeline_stage": "${eventKey === "LEAD_QUALIFIED" ? "MQL" : eventKey === "MEETING_SCHEDULED" ? "SQL" : eventKey === "PURCHASE" ? "Closed Won" : eventKey === "LEAD_DISQUALIFIED" ? "Discarded" : "New"}",${eventKey === "LEAD_DISQUALIFIED" ? `
            "disqualification_reason": lead_data.get("reason"),` : ''}
            "crm_source": "Pipedrive"
        }
    }
    
    response = requests.post(webhook_url, json=payload)
    return response.json()`;
  };

  const getPhpExample = (eventKey: EventPresetKey) => {
    if (!webhookUrl) return '';
    const preset = EVENT_PRESETS[eventKey];
    return `<?php
// Integração PHP
function send${preset.name}($leadData) {
    $webhookUrl = "${webhookUrl}";
    
    $payload = [
        "leadId" => $leadData["id"],
        "eventName" => "${preset.name}",
        "actionSource" => "${preset.actionSource}",${eventKey === "PURCHASE" ? `
        "value" => $leadData["value"],
        "currency" => "BRL",` : ''}
        "userData" => [
            "email" => $leadData["email"],
            "phone" => $leadData["phone"],
            "firstName" => $leadData["first_name"],
            "lastName" => $leadData["last_name"]
        ],
        "customData" => [
            "lead_id" => $leadData["id"],
            "pipeline_stage" => "${eventKey === "LEAD_QUALIFIED" ? "MQL" : eventKey === "MEETING_SCHEDULED" ? "SQL" : eventKey === "PURCHASE" ? "Closed Won" : eventKey === "LEAD_DISQUALIFIED" ? "Discarded" : "New"}",${eventKey === "LEAD_DISQUALIFIED" ? `
            "disqualification_reason" => $leadData["reason"] ?? null,` : ''}
            "crm_source" => "Pipedrive"
        ]
    ];
    
    $ch = curl_init($webhookUrl);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}
?>`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Integração Webhook - Conversões Offline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Integração Webhook - Conversões Offline
        </CardTitle>
        <CardDescription>
          Configure a integração automática do seu CRM para enviar conversões offline ao Meta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!token ? (
          <div className="text-center py-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Gere uma URL de webhook para permitir que seu CRM envie conversões automaticamente
            </p>
            <Button
              onClick={() => generateToken()}
              disabled={isGenerating}
            >
              {isGenerating ? "Gerando..." : "Gerar URL do Webhook"}
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">URL do Webhook</label>
                <Badge variant="outline" className="text-xs">
                  {token.last_used_at 
                    ? `Usado em ${new Date(token.last_used_at).toLocaleDateString()}`
                    : "Nunca usado"
                  }
                </Badge>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={webhookUrl || ''}
                  readOnly
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(webhookUrl || '', 'URL copiada para a área de transferência')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleTestWebhook}
                disabled={isTesting}
              >
                <TestTube className="h-4 w-4 mr-2" />
                {isTesting ? "Testando..." : "Testar Webhook"}
              </Button>
              <Button
                variant="outline"
                onClick={() => regenerateToken()}
                disabled={isRegenerating}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {isRegenerating ? "Regenerando..." : "Regenerar Token"}
              </Button>
            </div>

            <Separator />

            <Collapsible open={showDocs} onOpenChange={setShowDocs}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Documentação Completa da API
                  </span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-6 pt-4">
                {/* Visão Geral */}
                <Alert>
                  <AlertDescription className="text-sm">
                    <strong>📌 Sistema de Timeline de Eventos</strong>
                    <p className="mt-2">
                      Rastreie a jornada completa do lead desde a entrada no CRM até o fechamento da venda, 
                      enviando múltiplos eventos com o mesmo <code className="bg-muted px-1 py-0.5 rounded">leadId</code>:
                    </p>
                    <p className="mt-2 font-mono text-xs">
                      Lead → LeadQualified → MeetingScheduled → ProposalSent → Purchase
                    </p>
                    <p className="mt-2">Ou identifique leads de baixa qualidade:</p>
                    <p className="font-mono text-xs">Lead → LeadDisqualified</p>
                  </AlertDescription>
                </Alert>

                {/* Tabela de Eventos */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">📊 Eventos Disponíveis</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left">Evento</th>
                          <th className="p-2 text-left">Nome no Meta</th>
                          <th className="p-2 text-left">Quando Usar</th>
                          <th className="p-2 text-center">Otimizável?</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(EVENT_PRESETS).slice(0, -1).map(([key, preset]) => {
                          const Icon = getEventIcon(key as EventPresetKey);
                          return (
                            <tr key={key} className="border-t">
                              <td className="p-2">
                                <div className="flex items-center gap-2">
                                  <Icon className="h-3 w-3" style={{ color: `hsl(var(--${preset.color}))` }} />
                                  {preset.displayName}
                                </div>
                              </td>
                              <td className="p-2 font-mono">{preset.name}</td>
                              <td className="p-2 text-muted-foreground">{preset.description}</td>
                              <td className="p-2 text-center">
                                {'metaOptimizable' in preset && preset.metaOptimizable ? (
                                  <Badge variant="default" className="text-xs">✅ Sim</Badge>
                                ) : 'isNegativeSignal' in preset && preset.isNegativeSignal ? (
                                  <Badge variant="destructive" className="text-xs">❌ Negativo</Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Estrutura Base */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">🔧 Estrutura Base do Payload</h4>
                  <div className="relative">
                    <pre className="p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto max-h-96">
{`{
  // === IDENTIFICAÇÃO DO LEAD ===
  "leadId": "12345",  // ⚠️ RECOMENDADO: ID único (rastreia timeline)
  
  // === EVENTO ===
  "eventName": "LeadQualified",  // Ver tabela acima
  "eventTime": 1731144060,       // Unix timestamp (opcional)
  
  // === ORIGEM ===
  "actionSource": "crm",  // "crm", "system_generated", "website"
  
  // === VALOR (quando aplicável) ===
  "value": 5500.00,      // Obrigatório para Purchase
  "currency": "BRL",     // Moeda (padrão: BRL)
  
  // === DADOS DO USUÁRIO ===
  "userData": {
    "email": "lead@empresa.com",      // ⚠️ Email OU phone obrigatório
    "phone": "+5521999999999",        // Formato: +55 DDD número
    "firstName": "João",              // Recomendado
    "lastName": "Silva",
    "city": "Rio de Janeiro",
    "state": "RJ",
    "zip": "20000-000",
    "country": "BR",                  // Código ISO 2 letras
    "fbc": "fb.1.xxx",                // Cookie _fbc do Facebook
    "fbp": "fb.1.xxx"                 // Cookie _fbp do Facebook
  },
  
  // === DADOS CUSTOMIZADOS ===
  "customData": {
    "pipeline_stage": "MQL",           // Etapa do funil
    "crm_source": "Pipedrive",         // Nome do CRM
    "segment": "Software House",       // Segmento
    "disqualification_reason": "..."   // Obrigatório se LeadDisqualified
  }
}`}
                    </pre>
                  </div>
                </div>

                {/* Exemplos por Evento */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">📝 Exemplos por Tipo de Evento</h4>
                  <Tabs value={selectedEvent} onValueChange={(v) => setSelectedEvent(v as EventPresetKey)}>
                    <TabsList className="grid grid-cols-6 w-full">
                      <TabsTrigger value="LEAD_CREATED" className="text-xs">
                        <UserPlus className="h-3 w-3 mr-1" />
                        Lead
                      </TabsTrigger>
                      <TabsTrigger value="LEAD_QUALIFIED" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Qualificado
                      </TabsTrigger>
                      <TabsTrigger value="MEETING_SCHEDULED" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        Reunião
                      </TabsTrigger>
                      <TabsTrigger value="PROPOSAL_SENT" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        Proposta
                      </TabsTrigger>
                      <TabsTrigger value="PURCHASE" className="text-xs">
                        <DollarSign className="h-3 w-3 mr-1" />
                        Compra
                      </TabsTrigger>
                      <TabsTrigger value="LEAD_DISQUALIFIED" className="text-xs">
                        <UserX className="h-3 w-3 mr-1" />
                        Desqual.
                      </TabsTrigger>
                    </TabsList>

                    {(Object.keys(EVENT_PRESETS).slice(0, -1) as EventPresetKey[]).map((eventKey) => (
                      <TabsContent key={eventKey} value={eventKey} className="space-y-4">
                        <Alert>
                          <AlertDescription className="text-xs">
                            <strong>{EVENT_PRESETS[eventKey].displayName}</strong>
                            <p className="mt-1">{EVENT_PRESETS[eventKey].description}</p>
                            {'metaOptimizable' in EVENT_PRESETS[eventKey] && EVENT_PRESETS[eventKey].metaOptimizable && (
                              <p className="mt-2 text-green-600">⭐ Este evento pode ser usado para otimizar campanhas no Meta!</p>
                            )}
                            {'isNegativeSignal' in EVENT_PRESETS[eventKey] && EVENT_PRESETS[eventKey].isNegativeSignal && (
                              <p className="mt-2 text-red-600">⚠️ Usado para criar públicos de exclusão no Meta</p>
                            )}
                          </AlertDescription>
                        </Alert>

                        {/* cURL */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-semibold">cURL</h5>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(getCurlExample(eventKey), 'Exemplo cURL copiado')}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copiar
                            </Button>
                          </div>
                          <pre className="p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto max-h-48">
                            {getCurlExample(eventKey)}
                          </pre>
                        </div>

                        {/* JavaScript */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-semibold">JavaScript / Node.js</h5>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(getJsExample(eventKey), 'Exemplo JavaScript copiado')}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copiar
                            </Button>
                          </div>
                          <pre className="p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto max-h-48">
                            {getJsExample(eventKey)}
                          </pre>
                        </div>

                        {/* Python */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-semibold">Python</h5>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(getPythonExample(eventKey), 'Exemplo Python copiado')}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copiar
                            </Button>
                          </div>
                          <pre className="p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto max-h-48">
                            {getPythonExample(eventKey)}
                          </pre>
                        </div>

                        {/* PHP */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-semibold">PHP</h5>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(getPhpExample(eventKey), 'Exemplo PHP copiado')}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copiar
                            </Button>
                          </div>
                          <pre className="p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto max-h-48">
                            {getPhpExample(eventKey)}
                          </pre>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>

                {/* Campos Especiais */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">⚙️ Campos Especiais</h4>
                  <div className="space-y-3 text-xs">
                    <div className="border-l-2 border-primary pl-3">
                      <strong className="font-mono">leadId</strong> (Recomendado)
                      <p className="text-muted-foreground mt-1">
                        ID único do lead (ex: "lead_12345", "PIPE-2024-001"). Use o mesmo ID em todos os eventos 
                        para rastrear a timeline completa do lead.
                      </p>
                    </div>
                    <div className="border-l-2 border-primary pl-3">
                      <strong className="font-mono">actionSource</strong>
                      <p className="text-muted-foreground mt-1">
                        Origem do evento: "crm" (padrão), "system_generated", "website", "app", "phone_call"
                      </p>
                    </div>
                    <div className="border-l-2 border-primary pl-3">
                      <strong className="font-mono">fbc / fbp</strong> (Cookies do Facebook)
                      <p className="text-muted-foreground mt-1">
                        ⚠️ Aumentam significativamente o match rate no Meta. Capture com JavaScript:
                      </p>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
{`function getCookie(name) {
  const value = \`; \${document.cookie}\`;
  const parts = value.split(\`; \${name}=\`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

const fbc = getCookie('_fbc');
const fbp = getCookie('_fbp');`}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Integrações Comuns */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">🔗 Integrações Comuns</h4>
                  <Tabs defaultValue="zapier" className="w-full">
                    <TabsList className="grid grid-cols-3 w-full">
                      <TabsTrigger value="zapier">
                        <Zap className="h-3 w-3 mr-1" />
                        Zapier
                      </TabsTrigger>
                      <TabsTrigger value="make">Make</TabsTrigger>
                      <TabsTrigger value="n8n">N8N</TabsTrigger>
                    </TabsList>

                    <TabsContent value="zapier" className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        <strong>Trigger:</strong> "Novo Lead no Pipedrive" / "Deal mudou de etapa"<br />
                        <strong>Action:</strong> "Webhooks by Zapier" → POST
                      </p>
                      <pre className="p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto">
{`{
  "leadId": "{{deal_id}}",
  "eventName": "LeadQualified",
  "actionSource": "crm",
  "userData": {
    "email": "{{person_email}}",
    "phone": "{{person_phone}}",
    "firstName": "{{person_first_name}}",
    "lastName": "{{person_last_name}}"
  },
  "customData": {
    "pipeline_stage": "{{stage_name}}",
    "crm_source": "Pipedrive"
  }
}`}
                      </pre>
                    </TabsContent>

                    <TabsContent value="make" className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        <strong>Módulo:</strong> HTTP &gt; Make a Request<br />
                        <strong>Method:</strong> POST | <strong>Content type:</strong> JSON
                      </p>
                      <pre className="p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto">
{`{
  "leadId": "{{lead.id}}",
  "eventName": "Purchase",
  "value": {{deal.value}},
  "currency": "BRL",
  "actionSource": "crm",
  "userData": {
    "email": "{{person.email}}",
    "phone": "{{person.phone}}"
  }
}`}
                      </pre>
                    </TabsContent>

                    <TabsContent value="n8n" className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        <strong>Node:</strong> HTTP Request<br />
                        <strong>Method:</strong> POST
                      </p>
                      <pre className="p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto">
{`{
  leadId: $json["deal"]["id"],
  eventName: "LeadQualified",
  actionSource: "crm",
  userData: {
    email: $json["person"]["email"],
    phone: $json["person"]["phone"]
  },
  customData: {
    pipeline_stage: $json["stage"]["name"]
  }
}`}
                      </pre>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Boas Práticas */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">✅ Boas Práticas</h4>
                  <div className="grid gap-2 text-xs">
                    <div className="flex gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Sempre envie o <code className="bg-muted px-1 py-0.5 rounded">leadId</code> para rastrear a timeline completa</span>
                    </div>
                    <div className="flex gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Inclua o máximo de dados do usuário (email, phone, nome, cidade) para aumentar match rate</span>
                    </div>
                    <div className="flex gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Envie eventos em ordem cronológica: Lead → LeadQualified → Meeting → Purchase</span>
                    </div>
                    <div className="flex gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Use <code className="bg-muted px-1 py-0.5 rounded">disqualification_reason</code> detalhado para análises futuras</span>
                    </div>
                    <div className="flex gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Configure retry/fallback no CRM caso o webhook falhe</span>
                    </div>
                    <div className="flex gap-2">
                      <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Nunca envie o mesmo evento duas vezes para o mesmo lead (gera duplicatas)</span>
                    </div>
                    <div className="flex gap-2">
                      <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>Não omita o <code className="bg-muted px-1 py-0.5 rounded">value</code> no evento Purchase</span>
                    </div>
                  </div>
                </div>

                {/* Respostas da API */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">📋 Respostas da API</h4>
                  <Tabs defaultValue="success" className="w-full">
                    <TabsList className="grid grid-cols-2 w-full">
                      <TabsTrigger value="success">Sucesso</TabsTrigger>
                      <TabsTrigger value="error">Erros</TabsTrigger>
                    </TabsList>

                    <TabsContent value="success">
                      <pre className="p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto">
{`{
  "success": true,
  "message": "Conversion sent successfully to Meta",
  "conversionId": "uuid-da-conversao",
  "eventId": "lead_12345_LeadQualified_1731144060",
  "metaResponse": {
    "events_received": 1,
    "messages": [],
    "fbtrace_id": "..."
  }
}`}
                      </pre>
                    </TabsContent>

                    <TabsContent value="error" className="space-y-3">
                      <div>
                        <p className="text-xs font-medium mb-1">Cliente não configurado:</p>
                        <pre className="p-2 bg-muted rounded-md text-xs font-mono overflow-x-auto">
{`{
  "success": false,
  "error": "Offline Event Set ID not configured"
}`}
                        </pre>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-1">Token inválido:</p>
                        <pre className="p-2 bg-muted rounded-md text-xs font-mono overflow-x-auto">
{`{
  "success": false,
  "error": "Invalid webhook token"
}`}
                        </pre>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-1">Dados incompletos:</p>
                        <pre className="p-2 bg-muted rounded-md text-xs font-mono overflow-x-auto">
{`{
  "success": false,
  "error": "Email or phone is required in userData"
}`}
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
    </Card>
  );
};
