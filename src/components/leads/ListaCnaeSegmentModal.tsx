import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Database, Search, X, Plus, Building2, MapPin, DollarSign, 
  Calendar, Phone, Mail, CreditCard, Eye, Download, AlertCircle,
  Loader2, CheckCircle
} from "lucide-react";

interface ListaCnaeSegmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
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

const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export const ListaCnaeSegmentModal = ({ open, onOpenChange, companyId }: ListaCnaeSegmentModalProps) => {
  const queryClient = useQueryClient();
  
  // Form state
  const [segmentName, setSegmentName] = useState("");
  const [segmentDescription, setSegmentDescription] = useState("");
  const [cnaeInput, setCnaeInput] = useState("");
  const [filters, setFilters] = useState<Filters>({
    cnaes: [],
    estados: [],
    municipios: [],
    telefone_obrigatorio: false,
    email_obrigatorio: false,
  });
  const [maxLeads, setMaxLeads] = useState(100);
  
  // Preview state
  const [previewData, setPreviewData] = useState<PreviewEmpresa[]>([]);
  const [previewTotal, setPreviewTotal] = useState<number | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  // Import state
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

  const handleAddCnae = () => {
    const cnae = cnaeInput.trim().replace(/\D/g, '');
    if (!cnae) return;
    if (filters.cnaes.includes(cnae)) {
      toast.error("CNAE já adicionado");
      return;
    }
    setFilters(prev => ({ ...prev, cnaes: [...prev.cnaes, cnae] }));
    setCnaeInput('');
  };

  const handleRemoveCnae = (cnaeToRemove: string) => {
    setFilters(prev => ({ ...prev, cnaes: prev.cnaes.filter(c => c !== cnaeToRemove) }));
  };

  const handleToggleEstado = (estado: string) => {
    setFilters(prev => ({
      ...prev,
      estados: prev.estados.includes(estado)
        ? prev.estados.filter(e => e !== estado)
        : [...prev.estados, estado]
    }));
  };

  const handlePreview = async () => {
    if (filters.cnaes.length === 0 && filters.estados.length === 0) {
      toast.error("Adicione pelo menos um CNAE ou estado");
      return;
    }

    setIsPreviewLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await supabase.functions.invoke('listacnae-integration/search', {
        body: { 
          company_id: companyId,
          filters,
          preview: true
        },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (response.error) throw response.error;
      
      const result = response.data;
      setPreviewData(result.empresas || result.data || []);
      setPreviewTotal(result.total || result.totalRegistros || 0);
      
      if (result.total === 0) {
        toast.info("Nenhuma empresa encontrada com os filtros selecionados");
      }
    } catch (error: any) {
      console.error("Preview error:", error);
      toast.error(error.message || "Erro ao buscar prévia");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleCreateAndImport = async () => {
    if (!segmentName.trim()) {
      toast.error("Digite um nome para o segmento");
      return;
    }
    if (filters.cnaes.length === 0) {
      toast.error("Adicione pelo menos um CNAE");
      return;
    }
    if (!clients || clients.length === 0) {
      toast.error("Nenhum cliente ativo encontrado. Crie um cliente primeiro.");
      return;
    }

    const clientId = clients[0].id;
    
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
            per_page: maxLeads
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
    // Reset all state
    setSegmentName("");
    setSegmentDescription("");
    setCnaeInput("");
    setFilters({
      cnaes: [],
      estados: [],
      municipios: [],
      telefone_obrigatorio: false,
      email_obrigatorio: false,
    });
    setMaxLeads(100);
    setPreviewData([]);
    setPreviewTotal(null);
    setIsImporting(false);
    setImportProgress(0);
    setImportResult(null);
    onOpenChange(false);
  };

  const creditsNeeded = Math.min(maxLeads, previewTotal || maxLeads);
  const hasEnoughCredits = credits !== null && credits >= creditsNeeded;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Novo Segmento com ListaCNAE
          </DialogTitle>
          <DialogDescription>
            Configure os filtros para buscar empresas na API ListaCNAE e criar um segmento automaticamente.
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
        ) : (
          <>
            <ScrollArea className="flex-1 pr-4">
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

                {/* Segment Info */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Informações do Segmento
                  </h4>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>Nome do Segmento *</Label>
                      <Input
                        placeholder="Ex: Empresas de TI - SP"
                        value={segmentName}
                        onChange={(e) => setSegmentName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea
                        placeholder="Descreva o segmento..."
                        value={segmentDescription}
                        onChange={(e) => setSegmentDescription(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* CNAEs */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    CNAEs *
                  </h4>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite o código CNAE (ex: 6201501)"
                      value={cnaeInput}
                      onChange={(e) => setCnaeInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCnae())}
                      className="font-mono"
                    />
                    <Button type="button" variant="outline" onClick={handleAddCnae} disabled={!cnaeInput.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {filters.cnaes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {filters.cnaes.map((cnae) => (
                        <Badge key={cnae} variant="secondary" className="flex items-center gap-1 font-mono">
                          {cnae}
                          <button onClick={() => handleRemoveCnae(cnae)} className="ml-1 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Estados */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Estados (opcional)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {ESTADOS_BR.map((estado) => (
                      <Badge
                        key={estado}
                        variant={filters.estados.includes(estado) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleToggleEstado(estado)}
                      >
                        {estado}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Capital Social */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Capital Social (opcional)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Mínimo (R$)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={filters.capital_social_min || ""}
                        onChange={(e) => setFilters(prev => ({ 
                          ...prev, 
                          capital_social_min: e.target.value ? Number(e.target.value) : undefined 
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Máximo (R$)</Label>
                      <Input
                        type="number"
                        placeholder="Sem limite"
                        value={filters.capital_social_max || ""}
                        onChange={(e) => setFilters(prev => ({ 
                          ...prev, 
                          capital_social_max: e.target.value ? Number(e.target.value) : undefined 
                        }))}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Other Filters */}
                <div className="space-y-4">
                  <h4 className="font-medium">Outros Filtros</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="simples"
                        checked={filters.simples_nacional || false}
                        onCheckedChange={(checked) => 
                          setFilters(prev => ({ ...prev, simples_nacional: checked === true ? true : undefined }))
                        }
                      />
                      <Label htmlFor="simples">Simples Nacional</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mei"
                        checked={filters.mei || false}
                        onCheckedChange={(checked) => 
                          setFilters(prev => ({ ...prev, mei: checked === true ? true : undefined }))
                        }
                      />
                      <Label htmlFor="mei">MEI</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="telefone"
                        checked={filters.telefone_obrigatorio}
                        onCheckedChange={(checked) => 
                          setFilters(prev => ({ ...prev, telefone_obrigatorio: checked === true }))
                        }
                      />
                      <Label htmlFor="telefone" className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Telefone obrigatório
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="email"
                        checked={filters.email_obrigatorio}
                        onCheckedChange={(checked) => 
                          setFilters(prev => ({ ...prev, email_obrigatorio: checked === true }))
                        }
                      />
                      <Label htmlFor="email" className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> E-mail obrigatório
                      </Label>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Data Abertura */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data de Abertura (opcional)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>De</Label>
                      <Input
                        type="date"
                        value={filters.data_abertura_inicio || ""}
                        onChange={(e) => setFilters(prev => ({ ...prev, data_abertura_inicio: e.target.value || undefined }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Até</Label>
                      <Input
                        type="date"
                        value={filters.data_abertura_fim || ""}
                        onChange={(e) => setFilters(prev => ({ ...prev, data_abertura_fim: e.target.value || undefined }))}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Max Leads */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Quantidade Máxima de Leads
                  </h4>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      min={10}
                      max={10000}
                      value={maxLeads}
                      onChange={(e) => setMaxLeads(Math.min(10000, Math.max(10, Number(e.target.value))))}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">
                      (máx. 10.000 por importação)
                    </span>
                  </div>
                </div>

                {/* Preview Section */}
                {previewData.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Prévia dos Resultados
                        </h4>
                        <Badge variant="outline">
                          {previewTotal?.toLocaleString()} empresas encontradas
                        </Badge>
                      </div>
                      <div className="border rounded-lg overflow-hidden">
                        <div className="max-h-48 overflow-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted sticky top-0">
                              <tr>
                                <th className="text-left p-2">Empresa</th>
                                <th className="text-left p-2">CNAE</th>
                                <th className="text-left p-2">UF</th>
                                <th className="text-left p-2">Contato</th>
                              </tr>
                            </thead>
                            <tbody>
                              {previewData.map((empresa, i) => (
                                <tr key={i} className="border-t">
                                  <td className="p-2">
                                    <div className="font-medium truncate max-w-[200px]">{empresa.razao_social}</div>
                                    <div className="text-xs text-muted-foreground">{empresa.cnpj}</div>
                                  </td>
                                  <td className="p-2 font-mono text-xs">{empresa.cnae_principal}</td>
                                  <td className="p-2">{empresa.uf}</td>
                                  <td className="p-2 text-xs">
                                    {empresa.telefone && <div>{empresa.telefone}</div>}
                                    {empresa.email && <div className="truncate max-w-[150px]">{empresa.email}</div>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Import Progress */}
                {isImporting && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Importando leads...
                      </h4>
                      <Progress value={importProgress} />
                      <p className="text-sm text-muted-foreground text-center">
                        {importProgress < 30 && "Criando segmento..."}
                        {importProgress >= 30 && importProgress < 90 && "Importando empresas da ListaCNAE..."}
                        {importProgress >= 90 && "Finalizando..."}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
              <div className="flex items-center gap-2 mr-auto">
                {previewTotal !== null && (
                  <span className="text-sm text-muted-foreground">
                    Créditos necessários: ~{creditsNeeded.toLocaleString()}
                    {!hasEnoughCredits && <span className="text-destructive ml-1">(insuficiente)</span>}
                  </span>
                )}
              </div>
              <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                Cancelar
              </Button>
              <Button 
                variant="outline" 
                onClick={handlePreview} 
                disabled={isPreviewLoading || isImporting || (filters.cnaes.length === 0 && filters.estados.length === 0)}
              >
                {isPreviewLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
                Visualizar Prévia
              </Button>
              <Button 
                onClick={handleCreateAndImport} 
                disabled={isImporting || !segmentName.trim() || filters.cnaes.length === 0}
              >
                {isImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Criar e Importar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
