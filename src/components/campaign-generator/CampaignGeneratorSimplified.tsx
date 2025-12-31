import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useClients } from "@/hooks/useClients";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Sparkles, 
  Loader2, 
  Check,
  ChevronsUpDown,
  ChevronDown,
  Target,
  Users,
  Calendar,
  DollarSign,
  Layers,
  Zap,
  ShoppingBag,
  RotateCcw,
  Heart,
  TrendingUp,
  Clock,
  Save,
  RefreshCw,
  FileText,
  Settings,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type FunnelStage = "topo" | "meio" | "fundo" | "retencao";
type CampaignType = "awareness" | "traffic" | "leads" | "conversions" | "remarketing" | "retention";

interface GeneratedStrategy {
  budget: {
    daily: number;
    total: number;
    duration: number;
    distribution: string;
  };
  targeting: {
    demographics: string;
    interests: string[];
    behaviors: string;
    estimatedReach: string;
  };
  bidding: {
    strategy: string;
    targetCPA: number;
  };
  schedule: {
    duration: number;
    startDate: string;
    endDate: string;
    optimalHours: string;
  };
  adSets: Array<{
    name: string;
    budget: number;
    targeting: string;
  }>;
  recommendations: string[];
}

const FUNNEL_STAGES = [
  { id: "topo" as FunnelStage, label: "Topo", icon: TrendingUp, description: "Awareness" },
  { id: "meio" as FunnelStage, label: "Meio", icon: Users, description: "Consideração" },
  { id: "fundo" as FunnelStage, label: "Fundo", icon: Target, description: "Conversão" },
  { id: "retencao" as FunnelStage, label: "Retenção", icon: Heart, description: "Fidelização" },
];

const CAMPAIGN_TYPES: Record<CampaignType, { title: string; icon: React.ElementType; suitableFor: FunnelStage[] }> = {
  awareness: { title: "Brand Awareness", icon: Zap, suitableFor: ["topo"] },
  traffic: { title: "Tráfego", icon: Target, suitableFor: ["topo", "meio"] },
  leads: { title: "Geração de Leads", icon: Users, suitableFor: ["meio"] },
  conversions: { title: "Conversões", icon: ShoppingBag, suitableFor: ["fundo"] },
  remarketing: { title: "Remarketing", icon: RotateCcw, suitableFor: ["meio", "fundo", "retencao"] },
  retention: { title: "Retenção", icon: Heart, suitableFor: ["retencao"] },
};

interface CampaignGeneratorSimplifiedProps {
  onBack: () => void;
}

export function CampaignGeneratorSimplified({ onBack }: CampaignGeneratorSimplifiedProps) {
  const { toast } = useToast();
  const { clients } = useClients();
  const { activeCompany } = useCompany();

  // Form state
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [funnelStage, setFunnelStage] = useState<FunnelStage | "">("");
  const [campaignType, setCampaignType] = useState<CampaignType | "">("");
  const [customObjective, setCustomObjective] = useState("");
  const [dailyBudget, setDailyBudget] = useState(100);
  const [duration, setDuration] = useState(30);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedStrategy, setGeneratedStrategy] = useState<GeneratedStrategy | null>(null);

  // Derived state
  const selectedClient = useMemo(() => 
    clients?.find(c => c.id === selectedClientId), 
    [clients, selectedClientId]
  );

  const activeClients = useMemo(() => 
    (clients?.filter(c => !c.is_canceled) || []).sort((a, b) => a.name.localeCompare(b.name)), 
    [clients]
  );

  const availableCampaignTypes = useMemo(() => {
    if (!funnelStage) return [];
    return Object.entries(CAMPAIGN_TYPES)
      .filter(([_, type]) => type.suitableFor.includes(funnelStage as FunnelStage))
      .map(([id, type]) => ({ id: id as CampaignType, ...type }));
  }, [funnelStage]);

  const canGenerate = selectedClientId && funnelStage && campaignType;

  // Reset campaign type when funnel changes
  const handleFunnelChange = (value: string) => {
    setFunnelStage(value as FunnelStage);
    setCampaignType("");
    setGeneratedStrategy(null);
  };

  const handleGenerate = async () => {
    if (!selectedClient || !funnelStage || !campaignType) return;

    setIsGenerating(true);
    setGeneratedStrategy(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-campaign-strategy', {
        body: {
          client: {
            ...selectedClient,
            monthly_budget: dailyBudget * duration,
          },
          funnelStage,
          campaignType,
          step: 'campaign_configuration',
          customObjective,
          budget: {
            daily: dailyBudget,
            duration,
          }
        }
      });

      if (error) throw error;

      if (data?.configuration) {
        setGeneratedStrategy(data.configuration);
        toast({
          title: "Estratégia gerada!",
          description: "Sua estratégia de campanha foi criada com sucesso.",
        });
      }
    } catch (error: any) {
      console.error('Erro ao gerar estratégia:', error);
      toast({
        title: "Erro ao gerar estratégia",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedStrategy || !selectedClient) return;

    try {
      const { error } = await supabase.from('generated_campaigns').insert({
        client_id: selectedClientId,
        company_id: activeCompany?.company_id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        title: `${selectedClient.name} - ${CAMPAIGN_TYPES[campaignType as CampaignType]?.title || campaignType}`,
        funnel_stage: funnelStage,
        campaign_type: campaignType,
        configuration: generatedStrategy as any,
        creatives: [],
        status: 'draft',
      });

      if (error) throw error;

      toast({
        title: "Campanha salva!",
        description: "A campanha foi salva com sucesso.",
      });
      
      onBack();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Nova Campanha
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Client Selector */}
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientSearchOpen}
                  className="w-full justify-between h-11"
                >
                  {selectedClient ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={selectedClient.avatar || undefined} />
                        <AvatarFallback className="text-xs">
                          {selectedClient.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{selectedClient.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Selecione um cliente...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar cliente..." />
                  <CommandList>
                    <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="h-64">
                        {activeClients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.name}
                            onSelect={() => {
                              setSelectedClientId(client.id);
                              setClientSearchOpen(false);
                              setGeneratedStrategy(null);
                              // Set default budget from client
                              if (client.monthly_budget) {
                                setDailyBudget(Math.round(client.monthly_budget / 30));
                              }
                            }}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={client.avatar || undefined} />
                                <AvatarFallback className="text-xs">
                                  {client.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-sm">{client.name}</span>
                                <span className="text-xs text-muted-foreground">{client.sector}</span>
                              </div>
                            </div>
                            {selectedClientId === client.id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Funnel Stage Toggle */}
          <div className="space-y-2">
            <Label>Etapa do Funil</Label>
            <ToggleGroup
              type="single"
              value={funnelStage}
              onValueChange={handleFunnelChange}
              className="justify-start flex-wrap"
            >
              {FUNNEL_STAGES.map((stage) => {
                const Icon = stage.icon;
                return (
                  <ToggleGroupItem
                    key={stage.id}
                    value={stage.id}
                    aria-label={stage.label}
                    className="flex items-center gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-4"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{stage.label}</span>
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
          </div>

          {/* Campaign Type Select */}
          <div className="space-y-2">
            <Label>Tipo de Campanha</Label>
            <Select
              value={campaignType}
              onValueChange={(value) => {
                setCampaignType(value as CampaignType);
                setGeneratedStrategy(null);
              }}
              disabled={!funnelStage}
            >
              <SelectTrigger>
                <SelectValue placeholder={funnelStage ? "Selecione o tipo..." : "Selecione a etapa do funil primeiro"} />
              </SelectTrigger>
              <SelectContent>
                {availableCampaignTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span>{type.title}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Options */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Configurações Avançadas
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              {/* Custom Objective */}
              <div className="space-y-2">
                <Label>Objetivo Personalizado (opcional)</Label>
                <Textarea
                  placeholder="Descreva o objetivo específico desta campanha..."
                  value={customObjective}
                  onChange={(e) => setCustomObjective(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              {/* Daily Budget */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Orçamento Diário</Label>
                  <span className="text-sm font-medium">R$ {dailyBudget}</span>
                </div>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[dailyBudget]}
                    onValueChange={([value]) => setDailyBudget(value)}
                    min={10}
                    max={1000}
                    step={10}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={dailyBudget}
                    onChange={(e) => setDailyBudget(Number(e.target.value))}
                    className="w-24"
                    min={10}
                    max={10000}
                  />
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Duração (dias)</Label>
                  <span className="text-sm font-medium">{duration} dias</span>
                </div>
                <Slider
                  value={[duration]}
                  onValueChange={([value]) => setDuration(value)}
                  min={7}
                  max={90}
                  step={1}
                />
              </div>

              {/* Total Budget Display */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Orçamento Total Estimado</span>
                  <span className="font-semibold">R$ {(dailyBudget * duration).toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            className="w-full h-12"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Gerando Estratégia...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Gerar Estratégia com IA
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Strategy Card */}
      {generatedStrategy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                Estratégia Gerada
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                  Regenerar
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <DollarSign className="w-5 h-5 mx-auto mb-1 text-primary" />
                <div className="text-lg font-semibold">R$ {generatedStrategy.budget.daily}/dia</div>
                <div className="text-xs text-muted-foreground">Orçamento Diário</div>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <Calendar className="w-5 h-5 mx-auto mb-1 text-primary" />
                <div className="text-lg font-semibold">{generatedStrategy.schedule.duration} dias</div>
                <div className="text-xs text-muted-foreground">Duração</div>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
                <div className="text-lg font-semibold">{generatedStrategy.targeting.estimatedReach}</div>
                <div className="text-xs text-muted-foreground">Alcance Estimado</div>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <Layers className="w-5 h-5 mx-auto mb-1 text-primary" />
                <div className="text-lg font-semibold">{generatedStrategy.adSets.length}</div>
                <div className="text-xs text-muted-foreground">Conjuntos de Anúncios</div>
              </div>
            </div>

            {/* Details Accordion */}
            <Accordion type="multiple" defaultValue={["targeting", "adsets"]} className="w-full">
              {/* Targeting */}
              <AccordionItem value="targeting">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Segmentação
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Demografia</Label>
                    <p className="text-sm">{generatedStrategy.targeting.demographics}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Interesses</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {generatedStrategy.targeting.interests.map((interest, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Comportamentos</Label>
                    <p className="text-sm">{generatedStrategy.targeting.behaviors}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Ad Sets */}
              <AccordionItem value="adsets">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Conjuntos de Anúncios ({generatedStrategy.adSets.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {generatedStrategy.adSets.map((adSet, i) => (
                      <div key={i} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{adSet.name}</span>
                          <Badge variant="outline">R$ {adSet.budget}/dia</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{adSet.targeting}</p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Schedule */}
              <AccordionItem value="schedule">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Cronograma
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Início</Label>
                      <p className="text-sm">{new Date(generatedStrategy.schedule.startDate).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Término</Label>
                      <p className="text-sm">{new Date(generatedStrategy.schedule.endDate).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Horários Otimizados</Label>
                    <p className="text-sm">{generatedStrategy.schedule.optimalHours}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Distribuição de Orçamento</Label>
                    <p className="text-sm">{generatedStrategy.budget.distribution}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Bidding */}
              <AccordionItem value="bidding">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Estratégia de Lance
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Estratégia</Label>
                    <p className="text-sm">{generatedStrategy.bidding.strategy}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">CPA Alvo</Label>
                    <p className="text-sm font-medium">R$ {generatedStrategy.bidding.targetCPA}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Recommendations */}
              <AccordionItem value="recommendations">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Recomendações
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2">
                    {generatedStrategy.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
