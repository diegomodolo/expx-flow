import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, RefreshCw, TestTube, Link2, Code } from "lucide-react";
import { useWebhookTokens } from "@/hooks/useWebhookTokens";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

interface WebhookIntegrationCardProps {
  clientId: string;
}

export const WebhookIntegrationCard = ({ clientId }: WebhookIntegrationCardProps) => {
  const { toast } = useToast();
  const [showDocs, setShowDocs] = useState(false);
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

  const curlExample = webhookUrl ? `curl -X POST '${webhookUrl}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "eventName": "Purchase",
    "eventTime": ${Math.floor(Date.now() / 1000)},
    "value": 199.90,
    "currency": "BRL",
    "userData": {
      "email": "cliente@email.com",
      "phone": "11999999999",
      "firstName": "João",
      "lastName": "Silva",
      "city": "São Paulo",
      "state": "SP",
      "country": "BR"
    },
    "customData": {
      "content_name": "Produto XYZ",
      "order_id": "ORDER-001"
    }
  }'` : '';

  const jsExample = webhookUrl ? `// Integração JavaScript/Node.js
const webhookUrl = '${webhookUrl}';

async function sendConversion(orderData) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventName: 'Purchase',
      value: orderData.total,
      currency: 'BRL',
      userData: {
        email: orderData.customer.email,
        phone: orderData.customer.phone,
        firstName: orderData.customer.firstName,
        lastName: orderData.customer.lastName
      },
      customData: {
        order_id: orderData.id,
        content_name: orderData.product.name
      }
    })
  });
  
  return await response.json();
}` : '';

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
                    Documentação da API
                  </span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Endpoint</h4>
                  <code className="block p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto">
                    POST {webhookUrl}
                  </code>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Headers</h4>
                  <code className="block p-3 bg-muted rounded-md text-xs font-mono">
                    Content-Type: application/json
                  </code>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Campos Obrigatórios</h4>
                  <ul className="text-xs space-y-1 text-muted-foreground ml-4 list-disc">
                    <li><code>eventName</code> - Nome do evento (ex: "Purchase", "Lead")</li>
                    <li><code>userData.email</code> OU <code>userData.phone</code> - Pelo menos um dos dois</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Campos Opcionais</h4>
                  <ul className="text-xs space-y-1 text-muted-foreground ml-4 list-disc">
                    <li><code>eventTime</code> - Unix timestamp (padrão: agora)</li>
                    <li><code>value</code> - Valor da conversão</li>
                    <li><code>currency</code> - Moeda (padrão: "BRL")</li>
                    <li><code>userData.*</code> - firstName, lastName, city, state, zip, country</li>
                    <li><code>customData</code> - Dados customizados do pedido</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Exemplo cURL</h4>
                  <div className="relative">
                    <pre className="p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto">
                      {curlExample}
                    </pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(curlExample, 'Exemplo cURL copiado')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Exemplo JavaScript</h4>
                  <div className="relative">
                    <pre className="p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto">
                      {jsExample}
                    </pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(jsExample, 'Exemplo JavaScript copiado')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Resposta de Sucesso</h4>
                  <code className="block p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto">
                    {`{
  "success": true,
  "message": "Conversion sent successfully to Meta",
  "eventsReceived": 1,
  "client": "Nome do Cliente"
}`}
                  </code>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Resposta de Erro</h4>
                  <code className="block p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto">
                    {`{
  "success": false,
  "error": "Descrição do erro"
}`}
                  </code>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
    </Card>
  );
};
