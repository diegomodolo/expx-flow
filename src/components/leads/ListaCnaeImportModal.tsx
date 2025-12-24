import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Download, AlertCircle, Loader2, CheckCircle, CreditCard, Eye, Database, AlertTriangle
} from "lucide-react";

interface PreviewEmpresa {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  cnae_principal: string;
  cnae_descricao: string;
  uf: string;
  municipio: string;
  telefone: string;
  email: string;
}

interface ListaCnaeImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  segment: {
    id: string;
    name: string;
    cnaes: string[];
  };
}

export const ListaCnaeImportModal = ({
  open,
  onOpenChange,
  companyId,
  segment
}: ListaCnaeImportModalProps) => {
  const queryClient = useQueryClient();
  
  // Preview state
  const [previewCount, setPreviewCount] = useState(5);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewEmpresa[]>([]);
  const [previewTotal, setPreviewTotal] = useState<number>(0);
  const [showPreview, setShowPreview] = useState(false);
  
  // Import state
  const [totalToImport, setTotalToImport] = useState(100);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ imported: number; duplicates: number } | null>(null);

  // Fetch credits
  const { data: creditsData, isLoading: isLoadingCredits } = useQuery({
    queryKey: ['listacnae-credits', companyId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await supabase.functions.invoke('listacnae-integration/credits', {
        body: { company_id: companyId },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (response.error) throw response.error;
      return response.data;
    },
    enabled: open && !!companyId
  });

  // Fetch a default client for import
  const { data: clients } = useQuery({
    queryKey: ['clients-for-import', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('company_id', companyId)
        .limit(1);
      if (error) throw error;
      return data;
    },
    enabled: open && !!companyId
  });

  const isConfigured = creditsData?.configured && creditsData?.hasToken;
  const credits = creditsData?.credits;
  const clientId = clients?.[0]?.id;

  const hasEnoughCreditsForPreview = credits !== null && credits !== undefined && credits >= previewCount;
  const creditsNeeded = Math.min(totalToImport, previewTotal);
  const hasEnoughCreditsForImport = credits !== null && credits !== undefined && credits >= creditsNeeded;

  const handlePreview = async () => {
    setIsPreviewLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await supabase.functions.invoke('listacnae-integration/search', {
        body: { 
          company_id: companyId,
          filters: {
            cnaes: segment.cnaes,
            per_page: previewCount
          },
          preview: true
        },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (response.error) throw response.error;
      
      const result = response.data;
      const empresas = result.empresas || result.data || [];
      const total = result.total || result.totalRegistros || 0;
      
      setPreviewData(empresas);
      setPreviewTotal(total);
      setTotalToImport(Math.min(100, total));
      setShowPreview(true);
      
      if (total === 0) {
        toast.info("Nenhuma empresa encontrada com os CNAEs do segmento");
      }
    } catch (error: any) {
      console.error("Preview error:", error);
      toast.error(error.message || "Erro ao buscar prévia");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleImport = async () => {
    if (!clientId) {
      toast.error("Nenhum cliente ativo encontrado");
      return;
    }

    setIsImporting(true);
    setImportProgress(10);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      setImportProgress(30);

      // Import leads from ListaCNAE to existing segment
      const response = await supabase.functions.invoke('listacnae-integration/import', {
        body: { 
          company_id: companyId,
          segment_id: segment.id,
          client_id: clientId,
          filters: {
            cnaes: segment.cnaes,
            per_page: totalToImport
          }
        },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      setImportProgress(90);

      if (response.error) throw response.error;

      const result = response.data;
      setImportResult({
        imported: result.imported || 0,
        duplicates: result.duplicates || 0
      });
      
      setImportProgress(100);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['lead-segments'] });
      queryClient.invalidateQueries({ queryKey: ['lead-pool'] });
      queryClient.invalidateQueries({ queryKey: ['listacnae-credits'] });
      
      toast.success(`${result.imported || 0} leads importados para "${segment.name}"!`);
      
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(error.message || "Erro ao importar leads");
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    if (isImporting && importProgress < 100) {
      return; // Don't close while importing
    }
    setPreviewCount(5);
    setPreviewData([]);
    setPreviewTotal(0);
    setShowPreview(false);
    setTotalToImport(100);
    setIsImporting(false);
    setImportProgress(0);
    setImportResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Buscar Leads - {segment.name}
          </DialogTitle>
          <DialogDescription>
            Importe novos leads da ListaCNAE para o segmento usando os CNAEs configurados.
          </DialogDescription>
        </DialogHeader>

        {!isConfigured ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Token da ListaCNAE não configurado. Vá em Configurações {">"} ListaCNAE para configurar.
            </AlertDescription>
          </Alert>
        ) : importResult ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h3 className="text-xl font-semibold">Importação Concluída!</h3>
            <div className="text-center text-muted-foreground">
              <p><strong>{importResult.imported}</strong> leads importados</p>
              {importResult.duplicates > 0 && (
                <p className="text-sm">{importResult.duplicates} já existiam (atualizados)</p>
              )}
            </div>
            <Button onClick={handleClose} className="mt-4">
              Fechar
            </Button>
          </div>
        ) : isImporting ? (
          <div className="flex flex-col items-center justify-center py-12 gap-6">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="w-full max-w-md space-y-4">
              <Progress value={importProgress} />
              <p className="text-sm text-muted-foreground text-center">
                {importProgress < 30 && "Preparando importação..."}
                {importProgress >= 30 && importProgress < 90 && "Importando empresas da ListaCNAE..."}
                {importProgress >= 90 && "Finalizando..."}
              </p>
            </div>
          </div>
        ) : !showPreview ? (
          <>
            {/* Initial screen - configure preview */}
            <div className="space-y-6 py-4">
              {/* Credits Display */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Créditos disponíveis:</span>
                  </div>
                  <Badge variant={credits && credits > 100 ? "default" : "destructive"}>
                    {isLoadingCredits ? "..." : credits?.toLocaleString() ?? "N/A"}
                  </Badge>
                </CardContent>
              </Card>

              {/* CNAEs info */}
              <div className="space-y-2">
                <Label>CNAEs do Segmento</Label>
                <div className="flex flex-wrap gap-2">
                  {segment.cnaes.map((cnae) => (
                    <Badge key={cnae} variant="secondary" className="font-mono">
                      {cnae}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Preview count */}
              <div className="space-y-2">
                <Label>Quantidade para prévia (1-10)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={previewCount}
                    onChange={(e) => setPreviewCount(Math.min(10, Math.max(1, Number(e.target.value))))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    créditos serão consumidos
                  </span>
                </div>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    A prévia também consome créditos da ListaCNAE.
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                onClick={handlePreview} 
                disabled={isPreviewLoading || !hasEnoughCreditsForPreview}
              >
                {isPreviewLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Visualizar Prévia
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Preview screen */}
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-primary">{previewTotal.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Empresas encontradas</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-orange-500">{previewCount}</div>
                <div className="text-xs text-muted-foreground">Créditos usados (prévia)</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{credits?.toLocaleString() ?? "N/A"}</div>
                <div className="text-xs text-muted-foreground">Créditos disponíveis</div>
              </div>
            </div>

            {/* Preview Table */}
            <ScrollArea className="flex-1 border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium">Empresa</th>
                    <th className="text-left p-3 font-medium">CNAE</th>
                    <th className="text-left p-3 font-medium">UF</th>
                    <th className="text-left p-3 font-medium">Contato</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((empresa, i) => (
                    <tr key={i} className="border-t hover:bg-muted/30">
                      <td className="p-3">
                        <div className="font-medium truncate max-w-[200px]">{empresa.razao_social || empresa.nome_fantasia}</div>
                        <div className="text-xs text-muted-foreground font-mono">{empresa.cnpj}</div>
                      </td>
                      <td className="p-3 font-mono text-xs">{empresa.cnae_principal}</td>
                      <td className="p-3">
                        <Badge variant="outline">{empresa.uf}</Badge>
                      </td>
                      <td className="p-3 text-xs">
                        {empresa.telefone && <div className="flex items-center gap-1">📞 {empresa.telefone}</div>}
                        {empresa.email && <div className="truncate max-w-[150px] flex items-center gap-1">✉️ {empresa.email}</div>}
                        {!empresa.telefone && !empresa.email && <span className="text-muted-foreground">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>

            {/* Import Configuration */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Quantidade total a importar</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={1}
                      max={previewTotal}
                      value={totalToImport}
                      onChange={(e) => setTotalToImport(Math.min(previewTotal, Math.max(1, Number(e.target.value))))}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">
                      de {previewTotal.toLocaleString()} disponíveis
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    Créditos necessários:
                  </div>
                  <div className={`text-lg font-bold ${!hasEnoughCreditsForImport ? 'text-destructive' : 'text-primary'}`}>
                    {creditsNeeded.toLocaleString()}
                  </div>
                </div>
              </div>

              {!hasEnoughCreditsForImport && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Créditos insuficientes. Você tem {credits?.toLocaleString() ?? 0} créditos, mas precisa de {creditsNeeded.toLocaleString()}.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Voltar
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={!hasEnoughCreditsForImport || totalToImport <= 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Importar {totalToImport.toLocaleString()} leads
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
