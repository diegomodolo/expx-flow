import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LeadIntelligenceLayout } from "@/components/leads/LeadIntelligenceLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Search, Download, Globe, Phone, Mail, MapPin, Building2, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import { ImportDestinationModal } from "@/components/leads/ImportDestinationModal";
const BRAZILIAN_STATES = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
];

const BUSINESS_TYPES = [
  { value: "restaurantes", label: "Restaurantes", cnae: "5611-2/01" },
  { value: "farmácias drogarias", label: "Farmácias", cnae: "4771-7/01" },
  { value: "supermercados", label: "Supermercados", cnae: "4711-3/01" },
  { value: "padarias confeitarias", label: "Padarias", cnae: "1091-1/02" },
  { value: "postos gasolina combustível", label: "Postos de Combustível", cnae: "4731-8/00" },
  { value: "clínicas médicas", label: "Clínicas Médicas", cnae: "8630-5/01" },
  { value: "academias", label: "Academias", cnae: "9313-1/00" },
  { value: "lojas roupas vestuário", label: "Lojas de Roupas", cnae: "4781-4/00" },
  { value: "salões beleza cabeleireiro", label: "Salões de Beleza", cnae: "9602-5/01" },
  { value: "oficinas mecânicas", label: "Oficinas Mecânicas", cnae: "4520-0/01" },
  { value: "pet shops veterinárias", label: "Pet Shops", cnae: "4789-0/04" },
  { value: "escritórios advocacia advogados", label: "Escritórios de Advocacia", cnae: "6911-7/01" },
  { value: "contabilidade contadores", label: "Escritórios de Contabilidade", cnae: "6920-6/01" },
  { value: "imobiliárias", label: "Imobiliárias", cnae: "6821-8/01" },
  { value: "hotéis pousadas", label: "Hotéis e Pousadas", cnae: "5510-8/01" },
];

interface ExtractedLead {
  nome_fantasia: string | null;
  razao_social: string | null;
  website: string | null;
  phone: string | null;
  phone_2: string | null;
  email: string | null;
  endereco: string | null;
  cnpj: string | null;
  source_url: string;
  selected?: boolean;
}

export default function GoogleProspectingPage() {
  const { toast } = useToast();
  const { activeCompany } = useCompany();
  
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [quantity, setQuantity] = useState([10]);
  
  // Required fields filters
  const [requirePhone, setRequirePhone] = useState(false);
  const [requireEmail, setRequireEmail] = useState(false);
  const [requireWebsite, setRequireWebsite] = useState(false);
  const [requireAddress, setRequireAddress] = useState(false);
  
  const [isSearching, setIsSearching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [leads, setLeads] = useState<ExtractedLead[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchProgress, setSearchProgress] = useState({ step: 0, message: "", detail: "" });
  const [progressMessages, setProgressMessages] = useState<string[]>([]);
  const [foundCount, setFoundCount] = useState(0);

  // Animated progress messages
  const animationMessages = [
    "Conectando ao Google...",
    "Iniciando varredura de resultados...",
    "Analisando páginas encontradas...",
    "Extraindo informações de contato...",
    "Processando dados com IA...",
    "Validando telefones e emails...",
    "Verificando websites...",
    "Filtrando resultados inválidos...",
    "Buscando mais resultados...",
    "Quase lá...",
  ];

  const handleSearch = async () => {
    if (!state || !city || !businessType) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha estado, cidade e tipo de negócio",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setLeads([]);
    setProgressMessages([]);
    setFoundCount(0);
    setSearchProgress({
      step: 1,
      message: "Iniciando prospecção...",
      detail: `Buscando ${businessType} em ${city}/${state}`,
    });

    let messageIndex = 0;
    const intervalId = window.setInterval(() => {
      const newMessage = animationMessages[messageIndex % animationMessages.length];
      setProgressMessages((prev) => [...prev.slice(-4), newMessage]);
      setSearchProgress((prev) => ({
        ...prev,
        step: Math.min(prev.step + 0.3, 3.5),
        detail: newMessage,
      }));

      // Visual-only progress of "found" count
      setFoundCount((prev) => {
        const cap = Math.max(0, quantity[0] - 1);
        const bump = Math.random() < 0.35 ? 1 : 0;
        return Math.min(cap, prev + bump);
      });

      messageIndex++;
    }, 2000);

    try {
      const { data, error } = await supabase.functions.invoke("prospect-google-leads", {
        body: {
          state,
          city,
          businessType,
          quantity: quantity[0],
          requirePhone,
          requireEmail,
          requireWebsite,
          requireAddress,
        },
      });

      if (error) throw error;

      setSearchProgress({ step: 4, message: "Finalizando...", detail: "Preparando resultados" });

      if (!data?.success) {
        throw new Error(data?.error || "Erro na busca");
      }

      const leadsWithSelection = (data.leads || []).map((lead: ExtractedLead) => ({
        ...lead,
        selected: true,
      }));

      setLeads(leadsWithSelection);
      setFoundCount(leadsWithSelection.length);
      setSearchQuery(data.query);

      toast({
        title: "Busca concluída",
        description: `${leadsWithSelection.length} leads encontrados${data.requested ? ` (meta: ${data.requested})` : ""}${data.pagesSearched > 1 ? ` • ${data.pagesSearched} buscas` : ""}`,
      });

      if (data.requested && leadsWithSelection.length < data.requested) {
        toast({
          title: "Não foi possível completar a quantidade",
          description: `Encontrei ${leadsWithSelection.length}/${data.requested} com os filtros atuais. Tente remover um filtro ou aumentar a quantidade.`,
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Erro na busca",
        description: error instanceof Error ? error.message : "Falha ao prospectar leads",
        variant: "destructive",
      });
    } finally {
      window.clearInterval(intervalId);
      setIsSearching(false);
      setSearchProgress({ step: 0, message: "", detail: "" });
    }
  };

  const toggleLeadSelection = (index: number) => {
    setLeads(prev => prev.map((lead, i) => 
      i === index ? { ...lead, selected: !lead.selected } : lead
    ));
  };

  const toggleAllSelection = () => {
    const allSelected = leads.every(l => l.selected);
    setLeads(prev => prev.map(lead => ({ ...lead, selected: !allSelected })));
  };

  const handleImportClick = () => {
    const selectedLeads = leads.filter(l => l.selected);
    if (selectedLeads.length === 0) {
      toast({
        title: "Nenhum lead selecionado",
        description: "Selecione ao menos um lead para importar",
        variant: "destructive",
      });
      return;
    }
    setShowDestinationModal(true);
  };

  const handleImport = async (destinations: { cnaePool: boolean; segmentId: string | null }) => {
    if (!activeCompany) {
      toast({
        title: "Empresa não selecionada",
        description: "Selecione uma empresa para importar os leads",
        variant: "destructive",
      });
      return;
    }

    const selectedLeads = leads.filter(l => l.selected);
    if (selectedLeads.length === 0) return;

    setIsImporting(true);

    try {
      const businessTypeData = BUSINESS_TYPES.find(bt => bt.value === businessType);
      const cnaeCode = businessTypeData?.cnae || "0000-0/00";

      // Import to CNAE Pool
      if (destinations.cnaePool) {
        let successCount = 0;
        for (const lead of selectedLeads) {
          const cnpjValue = lead.cnpj || `TEMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          const { error } = await supabase
            .from('cnae_lead_pool')
            .upsert({
              company_id: activeCompany.company_id,
              cnpj: cnpjValue,
              cnae_code: cnaeCode,
              cnae_description: businessTypeData?.label || businessType,
              nome_fantasia: lead.nome_fantasia,
              razao_social: lead.razao_social,
              phone: lead.phone,
              phone_2: lead.phone_2,
              email: lead.email,
              logradouro: lead.endereco,
              municipio: city,
              uf: state,
              source: 'google_prospecting',
            }, { 
              onConflict: 'cnpj,company_id',
              ignoreDuplicates: true 
            });

          if (!error) successCount++;
        }
        
        if (successCount === 0 && selectedLeads.length > 0) {
          console.warn('No leads were imported to CNAE pool (all duplicates)');
        }
      }

      // Import to custom segment (lead_master_pool + assignment)
      if (destinations.segmentId) {
        for (const lead of selectedLeads) {
          // Insert into lead_master_pool
          const { data: insertedLead, error: leadError } = await supabase
            .from('lead_master_pool')
            .insert({
              company_id: activeCompany.company_id,
              full_name: lead.nome_fantasia || lead.razao_social,
              company_name: lead.razao_social || lead.nome_fantasia,
              email: lead.email,
              phone: lead.phone,
              whatsapp: lead.phone,
              city: city,
              state: state,
              company_segment: businessTypeData?.label || businessType,
              acquisition_channel: 'google_prospecting',
              source: 'google_prospecting',
            })
            .select('id')
            .single();

          if (leadError) {
            console.error('Error inserting lead:', leadError);
            continue;
          }

          // Assign to segment
          if (insertedLead) {
            await supabase
              .from('lead_segment_assignments')
              .insert({
                lead_id: insertedLead.id,
                segment_id: destinations.segmentId,
              });
          }
        }
      }

      const destMessages: string[] = [];
      if (destinations.cnaePool) destMessages.push("Base CNAE");
      if (destinations.segmentId) destMessages.push("Segmento Personalizado");

      toast({
        title: "Leads importados",
        description: `${selectedLeads.length} leads importados para ${destMessages.join(" e ")}`,
      });

      setShowDestinationModal(false);
      setLeads(prev => prev.filter(l => !l.selected));
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Erro na importação",
        description: error instanceof Error ? error.message : "Falha ao importar leads",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const selectedCount = leads.filter(l => l.selected).length;

  return (
    <DashboardLayout>
      <LeadIntelligenceLayout>
        <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Prospecção Google</h1>
          <p className="text-muted-foreground">
            Prospecte leads automaticamente usando busca no Google
          </p>
        </div>

        {/* Search Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Parâmetros de Busca
            </CardTitle>
            <CardDescription>
              Defina a localização e tipo de negócio para prospectar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAZILIAN_STATES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input 
                  placeholder="Digite a cidade"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Negócio</Label>
                <Select value={businessType} onValueChange={setBusinessType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map(bt => (
                      <SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantidade: {quantity[0]}</Label>
                <Slider
                  value={quantity}
                  onValueChange={setQuantity}
                  min={5}
                  max={50}
                  step={5}
                  className="mt-4"
                />
              </div>
            </div>

            {/* Required Fields Filters */}
            <div className="mt-6 pt-4 border-t">
              <Label className="text-sm font-medium mb-3 block">Filtros obrigatórios (só trazer leads que tenham):</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="requirePhone" 
                    checked={requirePhone} 
                    onCheckedChange={(checked) => setRequirePhone(checked === true)} 
                  />
                  <label htmlFor="requirePhone" className="text-sm flex items-center gap-1 cursor-pointer">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Telefone
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="requireEmail" 
                    checked={requireEmail} 
                    onCheckedChange={(checked) => setRequireEmail(checked === true)} 
                  />
                  <label htmlFor="requireEmail" className="text-sm flex items-center gap-1 cursor-pointer">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    E-mail
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="requireWebsite" 
                    checked={requireWebsite} 
                    onCheckedChange={(checked) => setRequireWebsite(checked === true)} 
                  />
                  <label htmlFor="requireWebsite" className="text-sm flex items-center gap-1 cursor-pointer">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    Website
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="requireAddress" 
                    checked={requireAddress} 
                    onCheckedChange={(checked) => setRequireAddress(checked === true)} 
                  />
                  <label htmlFor="requireAddress" className="text-sm flex items-center gap-1 cursor-pointer">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Endereço
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Prospectar Leads
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Progress Indicator */}
        {isSearching && (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
            <CardContent className="py-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Prospectando leads...
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-background/60">
                      Encontrados {foundCount}/{quantity[0]}
                    </Badge>
                    <Badge variant="outline" className="animate-pulse">
                      Em andamento
                    </Badge>
                  </div>
                </div>
                <Progress value={(searchProgress.step / 4) * 100} className="h-3" />
                
                {/* Step indicators */}
                <div className="flex items-center justify-between text-sm">
                  <div className={`flex items-center gap-2 transition-colors ${searchProgress.step >= 1 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {searchProgress.step > 1 ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Loader2 className={`h-4 w-4 ${searchProgress.step >= 1 ? 'animate-spin' : ''}`} />}
                    Conectar
                  </div>
                  <div className={`flex items-center gap-2 transition-colors ${searchProgress.step >= 2 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {searchProgress.step > 2 ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Loader2 className={`h-4 w-4 ${searchProgress.step >= 2 ? 'animate-spin' : ''}`} />}
                    Buscar
                  </div>
                  <div className={`flex items-center gap-2 transition-colors ${searchProgress.step >= 3 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {searchProgress.step > 3 ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Loader2 className={`h-4 w-4 ${searchProgress.step >= 3 ? 'animate-spin' : ''}`} />}
                    Extrair
                  </div>
                  <div className={`flex items-center gap-2 transition-colors ${searchProgress.step >= 4 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {searchProgress.step > 4 ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Loader2 className={`h-4 w-4 ${searchProgress.step >= 4 ? 'animate-spin' : ''}`} />}
                    Finalizar
                  </div>
                </div>

                {/* Live activity feed */}
                <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-2">Atividade:</p>
                  <div className="space-y-1 max-h-24 overflow-hidden">
                    {progressMessages.slice(-5).map((msg, i) => (
                      <p 
                        key={i} 
                        className={`text-sm transition-opacity ${i === progressMessages.length - 1 ? 'text-primary font-medium' : 'text-muted-foreground opacity-60'}`}
                      >
                        → {msg}
                      </p>
                    ))}
                    {progressMessages.length === 0 && (
                      <p className="text-sm text-muted-foreground animate-pulse">→ Iniciando...</p>
                    )}
                  </div>
                </div>

                {/* Current detail */}
                <div className="flex items-center gap-2 text-sm text-primary">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  {searchProgress.detail || searchProgress.message}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {leads.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Resultados</CardTitle>
                  <CardDescription>
                    {leads.length} leads encontrados • {selectedCount} selecionados
                    {searchQuery && <span className="ml-2 text-xs">({searchQuery})</span>}
                  </CardDescription>
                </div>
                <Button 
                  onClick={handleImportClick} 
                  disabled={isImporting || selectedCount === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Importar Selecionados ({selectedCount})
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={leads.every(l => l.selected)}
                          onCheckedChange={toggleAllSelection}
                        />
                      </TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Website</TableHead>
                      <TableHead>Dados</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Checkbox 
                            checked={lead.selected}
                            onCheckedChange={() => toggleLeadSelection(index)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {lead.nome_fantasia || "Sem nome"}
                            </div>
                            {lead.razao_social && (
                              <p className="text-xs text-muted-foreground">{lead.razao_social}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            {lead.phone && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {lead.phone}
                              </div>
                            )}
                            {lead.email && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {lead.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {lead.website && (
                            <a 
                              href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-sm flex items-center gap-1"
                            >
                              <Globe className="h-3 w-3" />
                              {(() => {
                                try {
                                  const url = lead.website.startsWith('http') ? lead.website : `https://${lead.website}`;
                                  return new URL(url).hostname;
                                } catch {
                                  return lead.website;
                                }
                              })()}
                            </a>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {lead.cnpj && <Badge variant="outline">CNPJ</Badge>}
                            {lead.endereco && <Badge variant="outline">Endereço</Badge>}
                            {lead.phone && <Badge variant="outline">Tel</Badge>}
                            {lead.email && <Badge variant="outline">Email</Badge>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!isSearching && leads.length === 0 && (
          <Card className="py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhuma busca realizada</h3>
              <p className="text-muted-foreground max-w-md mt-1">
                Preencha os parâmetros acima e clique em "Prospectar Leads" para buscar empresas no Google
              </p>
            </CardContent>
          </Card>
        )}

        {/* Import Destination Modal */}
        {activeCompany && (
          <ImportDestinationModal
            open={showDestinationModal}
            onOpenChange={setShowDestinationModal}
            onConfirm={handleImport}
            companyId={activeCompany.company_id}
            isImporting={isImporting}
            selectedCount={selectedCount}
          />
        )}
        </div>
      </LeadIntelligenceLayout>
    </DashboardLayout>
  );
}
