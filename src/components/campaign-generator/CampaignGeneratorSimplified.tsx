import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  DollarSign,
  Zap,
  ShoppingBag,
  RotateCcw,
  Heart,
  TrendingUp,
  Save,
  RefreshCw,
  Settings,
  Send,
  AlertCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Editable sections
import { EditableBudgetSection } from "./editable/EditableBudgetSection";
import { EditableTargetingSection } from "./editable/EditableTargetingSection";
import { AudienceIntegrationSection } from "./editable/AudienceIntegrationSection";
import { EditableScheduleSection } from "./editable/EditableScheduleSection";
import { EditableBiddingSection } from "./editable/EditableBiddingSection";
import { EditableAdSetsSection } from "./editable/EditableAdSetsSection";
import { 
  EditableStrategy, 
  EditableAdSet, 
  EditableCreative,
  CAMPAIGN_OBJECTIVES 
} from "./editable/types";

type FunnelStage = "topo" | "meio" | "fundo" | "retencao";
type CampaignType = "awareness" | "traffic" | "leads" | "conversions" | "remarketing" | "retention";

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

const createDefaultCreative = (): EditableCreative => ({
  id: crypto.randomUUID(),
  type: 'IMAGE',
  headline: '',
  body: '',
  description: '',
  linkUrl: '',
  callToAction: 'LEARN_MORE',
  mediaUrls: [],
  urlParameters: {},
});

const createDefaultAdSet = (name: string): EditableAdSet => ({
  id: crypto.randomUUID(),
  name,
  includedAudiences: [],
  excludedAudiences: [],
  creatives: [createDefaultCreative()],
});

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
  const [isPublishing, setIsPublishing] = useState(false);
  const [editableStrategy, setEditableStrategy] = useState<EditableStrategy | null>(null);

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
    setEditableStrategy(null);
  };

  const handleStrategyChange = (updates: Partial<EditableStrategy>) => {
    if (editableStrategy) {
      setEditableStrategy({ ...editableStrategy, ...updates });
    }
  };

  const handleGenerate = async () => {
    if (!selectedClient || !funnelStage || !campaignType) return;

    setIsGenerating(true);
    setEditableStrategy(null);

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
        const config = data.configuration;
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (config.schedule?.duration || duration));

        // Convert AI response to editable strategy
        const strategy: EditableStrategy = {
          dailyBudget: config.budget?.daily || dailyBudget,
          duration: config.schedule?.duration || duration,
          totalBudget: (config.budget?.daily || dailyBudget) * (config.schedule?.duration || duration),
          ageMin: 18,
          ageMax: 65,
          genders: ['all'],
          interests: config.targeting?.interests || [],
          behaviors: config.targeting?.behaviors ? [config.targeting.behaviors] : [],
          includedAudiences: [],
          excludedAudiences: [],
          startDate,
          endDate,
          useOptimalHours: true,
          optimalHours: config.schedule?.optimalHours || '9h-21h',
          bidStrategy: 'LOWEST_COST',
          targetCPA: config.bidding?.targetCPA,
          recommendations: config.recommendations || [],
          estimatedReach: config.targeting?.estimatedReach || '50k-100k',
          adSets: (config.adSets || []).map((as: any, i: number) => ({
            id: crypto.randomUUID(),
            name: as.name || `Conjunto ${i + 1}`,
            includedAudiences: [],
            excludedAudiences: [],
            creatives: [createDefaultCreative()],
          })),
        };

        // Ensure at least one ad set
        if (strategy.adSets.length === 0) {
          strategy.adSets = [createDefaultAdSet('Conjunto Principal')];
        }

        setEditableStrategy(strategy);
        toast({
          title: "Estratégia gerada!",
          description: "Agora você pode editar todos os campos antes de publicar.",
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

  const validateBeforePublish = (): string[] => {
    const errors: string[] = [];
    
    if (!selectedClient?.ad_account_id) {
      errors.push("Cliente não possui conta de anúncios Meta vinculada");
    }

    if (!editableStrategy) {
      errors.push("Nenhuma estratégia gerada");
      return errors;
    }

    if (editableStrategy.dailyBudget < 10) {
      errors.push("Orçamento diário mínimo é R$ 10");
    }

    if (editableStrategy.adSets.length === 0) {
      errors.push("Pelo menos 1 conjunto de anúncios é necessário");
    }

    for (const adSet of editableStrategy.adSets) {
      if (adSet.creatives.length === 0) {
        errors.push(`"${adSet.name}" precisa de pelo menos 1 criativo`);
      }

      for (const creative of adSet.creatives) {
        if (creative.mediaUrls.length === 0) {
          errors.push(`Criativo em "${adSet.name}" precisa de imagem/vídeo`);
        }
        if (!creative.body.trim()) {
          errors.push(`Criativo em "${adSet.name}" precisa de texto principal`);
        }
        if (!creative.linkUrl.trim()) {
          errors.push(`Criativo em "${adSet.name}" precisa de link de destino`);
        }
      }
    }

    return errors;
  };

  const handlePublishToMeta = async () => {
    if (!editableStrategy || !selectedClient || !campaignType) return;

    const errors = validateBeforePublish();
    if (errors.length > 0) {
      toast({
        title: "Validação falhou",
        description: errors[0],
        variant: "destructive",
      });
      return;
    }

    setIsPublishing(true);

    try {
      const campaignName = `${selectedClient.name} - ${CAMPAIGN_TYPES[campaignType]?.title || campaignType}`;
      const objective = CAMPAIGN_OBJECTIVES[campaignType] || 'OUTCOME_TRAFFIC';

      // Build payload for create-meta-campaign-full
      const payload = {
        clientId: selectedClientId,
        campaign: {
          name: campaignName,
          objective,
          daily_budget: editableStrategy.dailyBudget,
          status: 'PAUSED' as const, // Start paused for safety
        },
        adSets: editableStrategy.adSets.map(adSet => ({
          name: adSet.name,
          targeting: {
            custom_audiences: adSet.includedAudiences.length > 0 
              ? adSet.includedAudiences 
              : editableStrategy.includedAudiences,
            excluded_audiences: adSet.excludedAudiences.length > 0 
              ? adSet.excludedAudiences 
              : editableStrategy.excludedAudiences,
            age_min: editableStrategy.ageMin,
            age_max: editableStrategy.ageMax,
            genders: editableStrategy.genders.includes('all') 
              ? undefined 
              : editableStrategy.genders.map(g => g === 'male' ? 1 : 2),
          },
          creatives: adSet.creatives.map(creative => ({
            type: creative.type,
            media_urls: creative.mediaUrls,
            body: creative.body,
            title: creative.headline,
            description: creative.description,
            link_url: creative.linkUrl,
            call_to_action: creative.callToAction,
            url_parameters: creative.urlParameters,
          })),
        })),
      };

      const { data, error } = await supabase.functions.invoke('create-meta-campaign-full', {
        body: payload,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao criar campanha');

      toast({
        title: "Campanha publicada!",
        description: `A campanha "${campaignName}" foi criada no Meta Ads com status PAUSADO.`,
      });

      // Save to generated_campaigns
      await supabase.from('generated_campaigns').insert({
        client_id: selectedClientId,
        company_id: activeCompany?.company_id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        title: campaignName,
        funnel_stage: funnelStage,
        campaign_type: campaignType,
        configuration: editableStrategy as any,
        creatives: editableStrategy.adSets.flatMap(as => as.creatives) as any,
        status: 'published',
      });

      onBack();
    } catch (error: any) {
      console.error('Erro ao publicar:', error);
      toast({
        title: "Erro ao publicar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSave = async () => {
    if (!editableStrategy || !selectedClient) return;

    try {
      const campaignName = `${selectedClient.name} - ${CAMPAIGN_TYPES[campaignType as CampaignType]?.title || campaignType}`;

      const { error } = await supabase.from('generated_campaigns').insert({
        client_id: selectedClientId,
        company_id: activeCompany?.company_id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        title: campaignName,
        funnel_stage: funnelStage,
        campaign_type: campaignType,
        configuration: editableStrategy as any,
        creatives: editableStrategy.adSets.flatMap(as => as.creatives) as any,
        status: 'draft',
      });

      if (error) throw error;

      toast({
        title: "Campanha salva!",
        description: "A campanha foi salva como rascunho.",
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

  const validationErrors = editableStrategy ? validateBeforePublish() : [];

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
                              setEditableStrategy(null);
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
                setEditableStrategy(null);
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
              <div className="space-y-2">
                <Label>Objetivo Personalizado (opcional)</Label>
                <Textarea
                  placeholder="Descreva o objetivo específico desta campanha..."
                  value={customObjective}
                  onChange={(e) => setCustomObjective(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

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

      {/* Editable Strategy Sections */}
      {editableStrategy && selectedClient && (
        <>
          {/* Actions Bar */}
          <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              <span className="font-medium">Estratégia Gerada</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                Regenerar
              </Button>
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Rascunho
              </Button>
              <Button 
                size="sm" 
                onClick={handlePublishToMeta}
                disabled={isPublishing || validationErrors.length > 0}
              >
                {isPublishing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Publicar no Meta
              </Button>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Antes de publicar:</strong>
                <ul className="list-disc pl-4 mt-1">
                  {validationErrors.slice(0, 3).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {validationErrors.length > 3 && (
                    <li>...e mais {validationErrors.length - 3} erro(s)</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Budget & Duration */}
          <EditableBudgetSection
            strategy={editableStrategy}
            onChange={handleStrategyChange}
          />

          {/* Targeting */}
          <EditableTargetingSection
            strategy={editableStrategy}
            onChange={handleStrategyChange}
          />

          {/* Audiences */}
          <AudienceIntegrationSection
            strategy={editableStrategy}
            onChange={handleStrategyChange}
            clientId={selectedClientId}
          />

          {/* Ad Sets with Creatives */}
          <EditableAdSetsSection
            strategy={editableStrategy}
            onChange={handleStrategyChange}
            clientId={selectedClientId}
            clientName={selectedClient.name}
            clientAvatar={selectedClient.avatar || undefined}
          />

          {/* Schedule */}
          <EditableScheduleSection
            strategy={editableStrategy}
            onChange={handleStrategyChange}
          />

          {/* Bidding */}
          <EditableBiddingSection
            strategy={editableStrategy}
            onChange={handleStrategyChange}
          />

          {/* Recommendations */}
          {editableStrategy.recommendations.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Recomendações da IA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {editableStrategy.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
