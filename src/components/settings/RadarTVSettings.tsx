import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, ExternalLink, RefreshCw, Radar, AlertTriangle, TrendingUp } from "lucide-react";
import { useRadarTvDashboardToken } from "@/hooks/useRadarTvDashboardToken";
import { toast } from "sonner";

export function RadarTVSettings() {
  const { token, loading, generating, generateToken, regenerateToken, getPublicUrl } = useRadarTvDashboardToken();
  const [copied, setCopied] = useState(false);

  const publicUrl = getPublicUrl();

  const handleCopyUrl = async () => {
    if (!publicUrl) return;
    
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success('Link copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  const handleOpenInNewTab = () => {
    if (!publicUrl) return;
    window.open(publicUrl, '_blank');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Radar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Radar TV - Oportunidades e Riscos</CardTitle>
              <CardDescription>
                Dashboard público para exibição em TV mostrando riscos e oportunidades de todos os clientes
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Feature description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-sm">Detecção de Riscos</p>
                <p className="text-xs text-muted-foreground">
                  Monitora performance crítica, orçamento excedido, saldo baixo e campanhas inativas
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-500/5 border border-green-500/20">
              <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Identificação de Oportunidades</p>
                <p className="text-xs text-muted-foreground">
                  Encontra clientes prontos para escalar, otimizar ou expandir investimento
                </p>
              </div>
            </div>
          </div>

          {!token ? (
            <div className="text-center py-8">
              <Radar className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground mb-4">
                Nenhum token gerado ainda. Gere um token para acessar o dashboard Radar TV.
              </p>
              <Button onClick={generateToken} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  'Gerar Token de Acesso'
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Token de Acesso</Label>
                <div className="flex gap-2">
                  <Input 
                    value={token} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => regenerateToken()}
                    disabled={generating}
                    title="Regenerar token"
                  >
                    {generating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Este token é único e permite acesso público ao dashboard. Regenerar invalidará o link anterior.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Link Público do Dashboard</Label>
                <div className="flex gap-2">
                  <Input 
                    value={publicUrl || ''} 
                    readOnly 
                    className="text-sm"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleCopyUrl}
                    title="Copiar link"
                  >
                    <Copy className={`h-4 w-4 ${copied ? 'text-green-500' : ''}`} />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleOpenInNewTab}
                    title="Abrir em nova aba"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary">Público</Badge>
                <span className="text-xs text-muted-foreground">
                  Este link pode ser acessado sem autenticação
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como usar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>1.</strong> Gere um token de acesso clicando no botão acima
          </p>
          <p>
            <strong>2.</strong> Copie o link público do dashboard
          </p>
          <p>
            <strong>3.</strong> Abra o link em uma Smart TV ou monitor dedicado
          </p>
          <p>
            <strong>4.</strong> Use os controles flutuantes (canto inferior direito) para:
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Ajustar o zoom da página</li>
            <li>Configurar intervalo de atualização automática</li>
            <li>Alternar tema claro/escuro</li>
            <li>Ativar modo tela cheia</li>
            <li>Ativar modo kiosk (oculta controles)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
