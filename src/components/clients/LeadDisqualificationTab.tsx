import { Copy, RefreshCw, AlertCircle, ExternalLink, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useLeadDisqualificationTokens } from "@/hooks/useLeadDisqualificationTokens";
import { useLeadDisqualificationReports } from "@/hooks/useLeadDisqualificationReports";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadDisqualificationTabProps {
  clientId: string;
}

export function LeadDisqualificationTab({ clientId }: LeadDisqualificationTabProps) {
  const { toast } = useToast();
  const { tokens, loading: tokensLoading, getPublicReportUrl } = useLeadDisqualificationTokens(clientId);
  const { reports, loading: reportsLoading, getReasonLabel } = useLeadDisqualificationReports({ clientId });

  const currentToken = tokens[0]; // Primeiro token ativo
  const publicUrl = currentToken ? getPublicReportUrl(currentToken.token) : '';

  const handleCopyUrl = async () => {
    if (!publicUrl) return;
    
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast({
        title: "Copiado!",
        description: "Link copiado para a área de transferência",
      });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o link",
        variant: "destructive",
      });
    }
  };

  // Token é permanente, sem necessidade de regeneração

  const handleOpenPublicPage = () => {
    if (publicUrl) {
      window.open(publicUrl, '_blank');
    }
  };

  if (tokensLoading || reportsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-muted rounded-lg mb-4" />
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Link Público */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Link de Report de Lead Desqualificado
          </CardTitle>
          <CardDescription>
            Compartilhe este link com o cliente para que ele possa reportar leads desqualificados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentToken ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="public-url">Link Público</Label>
                <div className="flex gap-2">
                  <Input
                    id="public-url"
                    value={publicUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyUrl}
                    title="Copiar link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleOpenPublicPage}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Visualizar Página
                </Button>
                {/* Token é permanente, botão removido */}
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Este link é público e permanente. O cliente pode usá-lo quantas vezes precisar para reportar leads desqualificados.
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhum token ativo encontrado para este cliente. Entre em contato com o suporte.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Histórico de Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Histórico de Reports</span>
            <Badge variant="secondary">{reports.length} reports</Badge>
          </CardTitle>
          <CardDescription>
            Reports de leads desqualificados enviados pelo cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum report foi enviado ainda</p>
              <p className="text-sm">Os reports aparecerão aqui quando o cliente os enviar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {getReasonLabel(report.disqualification_reason)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        por {report.reporter_name}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(report.created_at), "PPP 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Data do Lead:</span>
                      <br />
                      {format(new Date(report.lead_received_date), "PPP", { locale: ptBR })}
                    </div>
                    {report.conversation_link && (
                      <div>
                        <span className="font-medium">Link da Conversa:</span>
                        <br />
                        <a
                          href={report.conversation_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline break-all"
                        >
                          {report.conversation_link}
                        </a>
                      </div>
                    )}
                  </div>

                  {report.additional_notes && (
                    <div>
                      <span className="font-medium text-sm">Observações:</span>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {report.additional_notes}
                      </p>
                    </div>
                  )}

                  {report.evidence_file_url && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Evidência:</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          // Implementar visualização/download da evidência
                          toast({
                            title: "Em desenvolvimento",
                            description: "Visualização de evidências em breve",
                          });
                        }}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Ver Evidência
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}