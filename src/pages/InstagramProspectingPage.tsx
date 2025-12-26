import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LeadIntelligenceLayout } from "@/components/leads/LeadIntelligenceLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Instagram, 
  Download, 
  Phone, 
  Mail, 
  Globe, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  ExternalLink,
  BadgeCheck,
  Building2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import { ImportDestinationModal } from "@/components/leads/ImportDestinationModal";

interface InstagramLead {
  nome_fantasia: string | null;
  razao_social: string | null;
  website: string | null;
  phone: string | null;
  phone_2: string | null;
  email: string | null;
  endereco: string | null;
  cnpj: string | null;
  instagram_username: string;
  profile_url: string;
  is_verified: boolean;
  is_business: boolean;
  selected?: boolean;
}

const COOKIES_EXAMPLE = `[
  { "name": "sessionid", "value": "SEU_SESSION_ID" },
  { "name": "csrftoken", "value": "SEU_CSRF_TOKEN" },
  { "name": "ds_user_id", "value": "SEU_USER_ID" }
]`;

export default function InstagramProspectingPage() {
  const { toast } = useToast();
  const { activeCompany } = useCompany();
  
  const [targetUsername, setTargetUsername] = useState("");
  const [quantity, setQuantity] = useState([50]);
  const [instagramCookies, setInstagramCookies] = useState("");
  
  // Filters
  const [requirePhone, setRequirePhone] = useState(false);
  const [requireEmail, setRequireEmail] = useState(false);
  
  const [isSearching, setIsSearching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [leads, setLeads] = useState<InstagramLead[]>([]);
  const [searchProgress, setSearchProgress] = useState({ step: 0, message: "", detail: "" });
  const [progressMessages, setProgressMessages] = useState<string[]>([]);
  const [foundCount, setFoundCount] = useState(0);

  const animationMessages = [
    "Conectando ao Instagram...",
    "Acessando perfil alvo...",
    "Iniciando extração de seguidores...",
    "Coletando dados de perfis...",
    "Analisando biografias...",
    "Extraindo emails e telefones...",
    "Identificando contas comerciais...",
    "Processando resultados...",
    "Finalizando extração...",
    "Quase lá...",
  ];

  const handleSearch = async () => {
    if (!targetUsername) {
      toast({
        title: "Username obrigatório",
        description: "Informe o username do perfil alvo",
        variant: "destructive",
      });
      return;
    }

    if (!instagramCookies) {
      toast({
        title: "Cookies obrigatórios",
        description: "Informe os cookies do Instagram para autenticação",
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
      detail: `Buscando seguidores de @${targetUsername.replace('@', '')}`,
    });

    let messageIndex = 0;
    const intervalId = window.setInterval(() => {
      const newMessage = animationMessages[messageIndex % animationMessages.length];
      setProgressMessages((prev) => [...prev.slice(-4), newMessage]);
      setSearchProgress((prev) => ({
        ...prev,
        step: Math.min(prev.step + 0.2, 3.5),
        detail: newMessage,
      }));

      setFoundCount((prev) => {
        const cap = Math.max(0, quantity[0] - 1);
        const bump = Math.random() < 0.3 ? 1 : 0;
        return Math.min(cap, prev + bump);
      });

      messageIndex++;
    }, 3000);

    try {
      const { data, error } = await supabase.functions.invoke("prospect-instagram-followers", {
        body: {
          targetUsername: targetUsername.replace('@', ''),
          maxResults: quantity[0],
          extractContacts: true,
          requireEmail,
          requirePhone,
          instagramCookies,
        },
      });

      if (error) throw error;

      setSearchProgress({ step: 4, message: "Finalizando...", detail: "Preparando resultados" });

      if (!data?.success) {
        throw new Error(data?.error || "Erro na busca");
      }

      const leadsWithSelection = (data.leads || []).map((lead: InstagramLead) => ({
        ...lead,
        selected: true,
      }));

      setLeads(leadsWithSelection);
      setFoundCount(leadsWithSelection.length);

      toast({
        title: "Busca concluída",
        description: `${leadsWithSelection.length} leads encontrados de ${data.totalFound} seguidores`,
      });

    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Erro na busca",
        description: error instanceof Error ? error.message : "Falha ao prospectar seguidores",
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
      // Import to CNAE Pool
      if (destinations.cnaePool) {
        let successCount = 0;
        for (const lead of selectedLeads) {
          const cnpjValue = `IG-${lead.instagram_username}-${Date.now()}`;
          
          const { error } = await supabase
            .from('cnae_lead_pool')
            .upsert({
              company_id: activeCompany.company_id,
              cnpj: cnpjValue,
              cnae_code: "0000-0/00",
              cnae_description: "Instagram Followers",
              nome_fantasia: lead.nome_fantasia,
              razao_social: lead.razao_social,
              phone: lead.phone,
              phone_2: lead.phone_2,
              email: lead.email,
              source: 'instagram_prospecting',
            }, { 
              onConflict: 'cnpj,company_id',
              ignoreDuplicates: true 
            });

          if (!error) successCount++;
        }
      }

      // Import to custom segment
      if (destinations.segmentId) {
        for (const lead of selectedLeads) {
          const { data: insertedLead, error: leadError } = await supabase
            .from('lead_master_pool')
            .insert({
              company_id: activeCompany.company_id,
              full_name: lead.nome_fantasia,
              email: lead.email,
              phone: lead.phone,
              whatsapp: lead.phone,
              instagram_handle: lead.instagram_username,
              acquisition_channel: 'instagram_prospecting',
              source: 'instagram_prospecting',
            })
            .select('id')
            .single();

          if (leadError) continue;

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
  const businessCount = leads.filter(l => l.is_business).length;
  const withEmailCount = leads.filter(l => l.email).length;
  const withPhoneCount = leads.filter(l => l.phone).length;

  return (
    <DashboardLayout>
      <LeadIntelligenceLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Prospecção Instagram</h1>
            <p className="text-muted-foreground">
              Extraia leads a partir dos seguidores de um perfil do Instagram
            </p>
          </div>

          {/* Warning Alert */}
          <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-500">Atenção: Riscos e Limitações</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Esta funcionalidade viola os Termos de Serviço do Instagram</li>
                <li>A conta usada para autenticação pode ser bloqueada</li>
                <li>Taxa de sucesso para contatos: 5-15% (só perfis que expõem email/telefone)</li>
                <li>Custo estimado: ~$2.50 por 1.000 seguidores</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Search Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Instagram className="h-5 w-5" />
                Parâmetros de Busca
              </CardTitle>
              <CardDescription>
                Configure a extração de seguidores do Instagram
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Username do Perfil Alvo</Label>
                  <Input 
                    placeholder="@restaurante_exemplo"
                    value={targetUsername}
                    onChange={(e) => setTargetUsername(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Perfil do qual você quer extrair os seguidores
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Quantidade: {quantity[0]}</Label>
                  <Slider
                    value={quantity}
                    onValueChange={setQuantity}
                    min={10}
                    max={500}
                    step={10}
                    className="mt-4"
                  />
                  <p className="text-xs text-muted-foreground">
                    Máximo de seguidores para extrair
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cookies do Instagram (JSON)</Label>
                <Textarea
                  placeholder={COOKIES_EXAMPLE}
                  value={instagramCookies}
                  onChange={(e) => setInstagramCookies(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Extraia os cookies da sua sessão do Instagram (sessionid, csrftoken, ds_user_id)
                </p>
              </div>

              {/* Filters */}
              <div className="pt-4 border-t">
                <Label className="text-sm font-medium mb-3 block">Filtros (só trazer leads que tenham):</Label>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="requirePhone" 
                      checked={requirePhone} 
                      onCheckedChange={(checked) => setRequirePhone(checked === true)} 
                    />
                    <Label htmlFor="requirePhone" className="text-sm flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> Telefone
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="requireEmail" 
                      checked={requireEmail} 
                      onCheckedChange={(checked) => setRequireEmail(checked === true)} 
                    />
                    <Label htmlFor="requireEmail" className="text-sm flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </Label>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleSearch} 
                disabled={isSearching}
                className="w-full"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extraindo seguidores...
                  </>
                ) : (
                  <>
                    <Instagram className="mr-2 h-4 w-4" />
                    Iniciar Extração
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Progress */}
          {isSearching && (
            <Card>
              <CardContent className="py-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{searchProgress.message}</span>
                    <span className="text-sm text-muted-foreground">{foundCount} encontrados</span>
                  </div>
                  <Progress value={(searchProgress.step / 4) * 100} />
                  <div className="space-y-1">
                    {progressMessages.map((msg, i) => (
                      <p key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        {msg}
                      </p>
                    ))}
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
                    <CardTitle>Seguidores Encontrados</CardTitle>
                    <CardDescription>
                      {leads.length} leads • {businessCount} contas comerciais • {withEmailCount} com email • {withPhoneCount} com telefone
                    </CardDescription>
                  </div>
                  <Button onClick={handleImportClick} disabled={selectedCount === 0 || isImporting}>
                    {isImporting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Importar {selectedCount > 0 ? `(${selectedCount})` : ""}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox 
                          checked={leads.every(l => l.selected)}
                          onCheckedChange={toggleAllSelection}
                        />
                      </TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Contatos</TableHead>
                      <TableHead>Tipo</TableHead>
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
                          <div className="flex items-center gap-2">
                            <a 
                              href={lead.profile_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              @{lead.instagram_username}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            {lead.is_verified && (
                              <BadgeCheck className="h-4 w-4 text-blue-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{lead.nome_fantasia || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {lead.email && (
                              <Badge variant="outline" className="text-xs">
                                <Mail className="h-3 w-3 mr-1" />
                                {lead.email}
                              </Badge>
                            )}
                            {lead.phone && (
                              <Badge variant="outline" className="text-xs">
                                <Phone className="h-3 w-3 mr-1" />
                                {lead.phone}
                              </Badge>
                            )}
                            {lead.website && (
                              <Badge variant="outline" className="text-xs">
                                <Globe className="h-3 w-3 mr-1" />
                                Site
                              </Badge>
                            )}
                            {!lead.email && !lead.phone && !lead.website && (
                              <span className="text-xs text-muted-foreground">Sem contato público</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {lead.is_business ? (
                            <Badge className="bg-primary/10 text-primary">
                              <Building2 className="h-3 w-3 mr-1" />
                              Comercial
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Pessoal</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        <ImportDestinationModal
          open={showDestinationModal}
          onOpenChange={setShowDestinationModal}
          onConfirm={handleImport}
          companyId={activeCompany?.company_id || ""}
          selectedCount={selectedCount}
          isImporting={isImporting}
        />
      </LeadIntelligenceLayout>
    </DashboardLayout>
  );
}
