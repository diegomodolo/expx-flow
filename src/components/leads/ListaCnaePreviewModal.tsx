import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Download, AlertCircle, Loader2, CheckCircle, CreditCard, Eye
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

interface Filters {
  cnaes: string[];
  estados: string[];
  municipios: string[];
  capital_social_min?: number;
  capital_social_max?: number;
  simples_nacional?: boolean;
  mei?: boolean;
  data_abertura_inicio?: string;
  data_abertura_fim?: string;
  telefone_obrigatorio: boolean;
  email_obrigatorio: boolean;
}

interface ListaCnaePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  clientId: string;
  segmentName: string;
  segmentDescription: string;
  filters: Filters;
  previewData: PreviewEmpresa[];
  previewTotal: number;
  previewCount: number;
  credits: number | null;
  onSuccess: () => void;
}

export const ListaCnaePreviewModal = ({
  open,
  onOpenChange,
  companyId,
  clientId,
  segmentName,
  segmentDescription,
  filters,
  previewData,
  previewTotal,
  previewCount,
  credits,
  onSuccess
}: ListaCnaePreviewModalProps) => {
  const queryClient = useQueryClient();
  
  const [totalToImport, setTotalToImport] = useState<number>(Math.min(100, previewTotal));
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ imported: number; duplicates: number } | null>(null);

  const creditsNeeded = Math.min(totalToImport, previewTotal);
  const hasEnoughCredits = credits !== null && credits >= creditsNeeded;

  const handleCreateAndImport = async () => {
    if (!segmentName.trim()) {
      toast.error("Nome do segmento não definido");
      return;
    }
    if (filters.cnaes.length === 0) {
      toast.error("Nenhum CNAE selecionado");
      return;
    }
    if (!clientId) {
      toast.error("Nenhum cliente ativo encontrado");
      return;
    }

    setIsImporting(true);
    setImportProgress(10);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      // 1. Create the segment
      setImportProgress(20);
      const { data: segment, error: segmentError } = await supabase
        .from('lead_segments')
        .insert({
          company_id: companyId,
          name: segmentName,
          description: segmentDescription || null,
          segment_type: 'custom',
          cnaes: filters.cnaes
        })
        .select('id')
        .single();

      if (segmentError) throw segmentError;
      
      setImportProgress(40);

      // 2. Import leads from ListaCNAE
      const response = await supabase.functions.invoke('listacnae-integration/import', {
        body: { 
          company_id: companyId,
          segment_id: segment.id,
          client_id: clientId,
          filters: {
            ...filters,
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
      
      toast.success(`Segmento criado com ${result.imported || 0} leads importados!`);
      
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(error.message || "Erro ao criar segmento e importar leads");
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    if (isImporting && importProgress < 100) {
      return; // Don't close while importing
    }
    setTotalToImport(Math.min(100, previewTotal));
    setIsImporting(false);
    setImportProgress(0);
    setImportResult(null);
    onOpenChange(false);
    
    if (importResult) {
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Prévia dos Resultados
          </DialogTitle>
          <DialogDescription>
            Confira as empresas encontradas e defina quantos leads deseja importar.
          </DialogDescription>
        </DialogHeader>

        {importResult ? (
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
                {importProgress < 30 && "Criando segmento..."}
                {importProgress >= 30 && importProgress < 90 && "Importando empresas da ListaCNAE..."}
                {importProgress >= 90 && "Finalizando..."}
              </p>
            </div>
          </div>
        ) : (
          <>
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
                  <div className={`text-lg font-bold ${!hasEnoughCredits ? 'text-destructive' : 'text-primary'}`}>
                    {creditsNeeded.toLocaleString()}
                  </div>
                </div>
              </div>

              {!hasEnoughCredits && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Créditos insuficientes. Você tem {credits?.toLocaleString() ?? 0} créditos, mas precisa de {creditsNeeded.toLocaleString()}.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateAndImport} 
                disabled={!hasEnoughCredits || totalToImport <= 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Criar e Importar {totalToImport.toLocaleString()} leads
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
