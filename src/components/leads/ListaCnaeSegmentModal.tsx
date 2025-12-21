import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Database, X, Plus, Building2, MapPin, DollarSign, 
  Calendar, Phone, Mail, CreditCard, Eye, AlertCircle,
  Loader2, AlertTriangle
} from "lucide-react";
import { ListaCnaePreviewModal } from "./ListaCnaePreviewModal";

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
  
  // Preview quantity (1-10)
  const [previewCount, setPreviewCount] = useState(5);
  
  // Preview modal state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewEmpresa[]>([]);
  const [previewTotal, setPreviewTotal] = useState<number>(0);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

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

    if (!segmentName.trim()) {
      toast.error("Digite um nome para o segmento");
      return;
    }

    setIsPreviewLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await supabase.functions.invoke('listacnae-integration/search', {
        body: { 
          company_id: companyId,
          filters: {
            ...filters,
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
      
      if (total === 0) {
        toast.info("Nenhuma empresa encontrada com os filtros selecionados");
      } else {
        // Open preview modal with results
        setIsPreviewModalOpen(true);
      }
    } catch (error: any) {
      console.error("Preview error:", error);
      toast.error(error.message || "Erro ao buscar prévia");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleClose = () => {
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
    setPreviewCount(5);
    setPreviewData([]);
    setPreviewTotal(0);
    setIsPreviewModalOpen(false);
    onOpenChange(false);
  };

  const handlePreviewModalSuccess = () => {
    // Close both modals and refresh data
    setIsPreviewModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['lead-segments'] });
    queryClient.invalidateQueries({ queryKey: ['lead-pool'] });
    handleClose();
  };

  const hasEnoughCreditsForPreview = credits !== null && credits >= previewCount;

  return (
    <>
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

                  {/* Preview Count */}
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Quantidade para Prévia
                    </h4>
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
                        (máx. 10 registros)
                      </span>
                    </div>
                    <Alert className="bg-amber-500/10 border-amber-500/30">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <AlertDescription className="text-amber-700 dark:text-amber-300">
                        A prévia também consome créditos ({previewCount} crédito{previewCount > 1 ? 's' : ''})
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handlePreview} 
                  disabled={
                    isPreviewLoading || 
                    (filters.cnaes.length === 0 && filters.estados.length === 0) ||
                    !segmentName.trim() ||
                    !hasEnoughCreditsForPreview
                  }
                >
                  {isPreviewLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
                  Visualizar Prévia
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <ListaCnaePreviewModal
        open={isPreviewModalOpen}
        onOpenChange={setIsPreviewModalOpen}
        companyId={companyId}
        clientId={clients?.[0]?.id || ""}
        segmentName={segmentName}
        segmentDescription={segmentDescription}
        filters={filters}
        previewData={previewData}
        previewTotal={previewTotal}
        previewCount={previewCount}
        credits={credits}
        onSuccess={handlePreviewModalSuccess}
      />
    </>
  );
};
