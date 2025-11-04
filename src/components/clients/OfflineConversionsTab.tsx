import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOfflineConversions } from "@/hooks/useOfflineConversions";
import { Loader2, CheckCircle, XCircle, Clock, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ConfigureOfflineEventSetDialog } from "./ConfigureOfflineEventSetDialog";
import { WebhookIntegrationCard } from "./WebhookIntegrationCard";

interface OfflineConversionsTabProps {
  clientId: string;
}

export const OfflineConversionsTab = ({ clientId }: OfflineConversionsTabProps) => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [value, setValue] = useState('');
  const [productName, setProductName] = useState('');

  const { conversions, isLoading, sendConversion, isSending } = useOfflineConversions(clientId);

  const handleSendConversion = async () => {
    if (!email && !phone) {
      alert('Informe pelo menos o email ou telefone do cliente.');
      return;
    }

    try {
      await sendConversion({
        clientId,
        eventName: 'Purchase',
        value: parseFloat(value) || 0,
        currency: 'BRL',
        userData: {
          email: email || undefined,
          phone: phone || undefined,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
        },
        customData: {
          content_name: productName || undefined,
          content_type: 'product',
        },
      });

      // Limpar formulário
      setEmail('');
      setPhone('');
      setFirstName('');
      setLastName('');
      setValue('');
      setProductName('');
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

  return (
    <div className="space-y-6">
      <WebhookIntegrationCard clientId={clientId} />
      
      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">📊 Conversões Offline do Meta</CardTitle>
          <CardDescription className="text-blue-700">
            Use esta funcionalidade para informar ao Meta quando um lead se converteu em cliente real. Isso ajuda o algoritmo do Meta a otimizar suas campanhas.
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

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Registrar Conversão Offline</CardTitle>
          <CardDescription>
            Preencha os dados do cliente que realizou a compra. Quanto mais informações, melhor a taxa de correspondência no Meta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="value">Valor da Compra (R$) *</Label>
              <Input 
                id="value"
                type="number"
                step="0.01"
                value={value} 
                onChange={(e) => setValue(e.target.value)} 
                placeholder="199.90" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productName">Nome do Produto/Serviço</Label>
              <Input 
                id="productName"
                value={productName} 
                onChange={(e) => setProductName(e.target.value)} 
                placeholder="Curso Avançado" 
              />
            </div>
          </div>
          <Button onClick={handleSendConversion} disabled={isSending || (!email && !phone)}>
            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enviar Conversão para o Meta
          </Button>
        </CardContent>
      </Card>

      {/* History Card */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Conversões Enviadas</CardTitle>
          <CardDescription>
            Acompanhe todas as conversões offline enviadas ao Meta para este cliente.
          </CardDescription>
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
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Resposta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversions.map((conversion) => (
                    <TableRow key={conversion.id}>
                      <TableCell>
                        {format(new Date(conversion.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{conversion.event_name}</TableCell>
                      <TableCell>
                        {conversion.value ? `R$ ${conversion.value.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(conversion.status)}</TableCell>
                      <TableCell>
                        {conversion.status === 'error' ? (
                          <span className="text-sm text-destructive">{conversion.error_message}</span>
                        ) : conversion.meta_response ? (
                          <span className="text-sm text-muted-foreground">
                            {JSON.stringify(conversion.meta_response).substring(0, 50)}...
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
