import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Target, Wand2, ImageIcon, Upload, X, Loader2, Plus, Lightbulb, Copy, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const SUGGESTED_PROMPT = `Se baseie 100% nas imagens de referência para criar as variações de imagem dos criativos. Todos os criativos de imagem gerado devem ter o texto da headline na imagem. Todos os textos gerados nas imagens devem ser 100% em português do Brasil`;
import { ReferenceSelectionDialog } from "@/components/clients/ReferenceSelectionDialog";
import { useCompany } from "@/contexts/CompanyContext";

interface Campaign {
  id: string;
  name: string;
  facebook_id: string | null;
}

interface AdSet {
  id: string;
  name: string;
  facebook_id: string;
  campaign_id: string;
}

interface ScheduleDestination {
  id?: string;
  campaign_id: string;
  campaign_name?: string;
  adset_id: string;
  adset_name?: string;
}

interface AdvancedConfig {
  target_campaign_id: string | null;
  target_adset_id: string | null;
  custom_image_prompt: string | null;
  reference_image_1: string | null;
  reference_image_2: string | null;
  reference_image_3: string | null;
  reference_image_4: string | null;
  reference_image_5: string | null;
  reference_image_6: string | null;
}

interface Props {
  clientId: string;
  scheduleId?: string;
  config: AdvancedConfig;
  onChange: (config: AdvancedConfig) => void;
}

export function FabricaConfiguracoesAvancadas({ clientId, scheduleId, config, onChange }: Props) {
  const { activeCompany } = useCompany();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adSetsByCampaign, setAdSetsByCampaign] = useState<Record<string, AdSet[]>>({});
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingAdSets, setLoadingAdSets] = useState<Record<string, boolean>>({});
  const [showReferenceDialog, setShowReferenceDialog] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);
  const [instagramAccountId, setInstagramAccountId] = useState<string | null>(null);
  const [expandedCampaigns, setExpandedCampaigns] = useState<string[]>([]);
  const [selectedDestinations, setSelectedDestinations] = useState<ScheduleDestination[]>([]);
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const [savingDestinations, setSavingDestinations] = useState(false);

  useEffect(() => {
    if (clientId) {
      loadCampaigns();
      loadClientInstagramId();
    }
  }, [clientId]);

  useEffect(() => {
    if (scheduleId) {
      loadDestinations();
    }
  }, [scheduleId]);

  const loadDestinations = async () => {
    if (!scheduleId) return;
    
    setLoadingDestinations(true);
    try {
      const { data, error } = await supabase
        .from('ad_generation_schedule_destinations')
        .select(`
          id,
          campaign_id,
          adset_id,
          campaigns:campaign_id(name),
          ad_sets:adset_id(name)
        `)
        .eq('schedule_id', scheduleId);

      if (error) throw error;

      const destinations: ScheduleDestination[] = (data || []).map((d: any) => ({
        id: d.id,
        campaign_id: d.campaign_id,
        campaign_name: d.campaigns?.name,
        adset_id: d.adset_id,
        adset_name: d.ad_sets?.name,
      }));

      setSelectedDestinations(destinations);

      // Expand campaigns that have destinations and load their ad sets
      const campaignIds = [...new Set(destinations.map(d => d.campaign_id))];
      setExpandedCampaigns(campaignIds);
      
      // Load ad sets for campaigns with destinations
      for (const campaignId of campaignIds) {
        loadAdSets(campaignId);
      }
    } catch (error) {
      console.error('Error loading destinations:', error);
    } finally {
      setLoadingDestinations(false);
    }
  };

  const loadClientInstagramId = async () => {
    const { data } = await supabase
      .from('clients')
      .select('instagram_account_id')
      .eq('id', clientId)
      .single();
    
    if (data?.instagram_account_id) {
      setInstagramAccountId(data.instagram_account_id);
    }
  };

  const loadCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name, facebook_id')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const loadAdSets = async (campaignId: string) => {
    if (adSetsByCampaign[campaignId]) return; // Already loaded
    
    setLoadingAdSets(prev => ({ ...prev, [campaignId]: true }));
    try {
      const { data, error } = await supabase
        .from('ad_sets')
        .select('id, name, facebook_id, campaign_id')
        .eq('campaign_id', campaignId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAdSetsByCampaign(prev => ({ ...prev, [campaignId]: data || [] }));
    } catch (error) {
      console.error('Error loading ad sets:', error);
    } finally {
      setLoadingAdSets(prev => ({ ...prev, [campaignId]: false }));
    }
  };

  const toggleExpandCampaign = (campaignId: string) => {
    if (!expandedCampaigns.includes(campaignId)) {
      loadAdSets(campaignId);
    }
    setExpandedCampaigns(prev => 
      prev.includes(campaignId) 
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const isAdSetSelected = (campaignId: string, adsetId: string) => {
    return selectedDestinations.some(d => d.campaign_id === campaignId && d.adset_id === adsetId);
  };

  const toggleAdSet = (campaign: Campaign, adSet: AdSet) => {
    setSelectedDestinations(prev => {
      const exists = prev.some(d => d.campaign_id === campaign.id && d.adset_id === adSet.id);
      if (exists) {
        return prev.filter(d => !(d.campaign_id === campaign.id && d.adset_id === adSet.id));
      }
      return [...prev, {
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        adset_id: adSet.id,
        adset_name: adSet.name,
      }];
    });
  };

  const removeDestination = (campaignId: string, adsetId: string) => {
    setSelectedDestinations(prev => 
      prev.filter(d => !(d.campaign_id === campaignId && d.adset_id === adsetId))
    );
  };

  const saveDestinations = async () => {
    if (!scheduleId) {
      toast.error('Salve a configuração primeiro antes de adicionar destinos.');
      return;
    }

    setSavingDestinations(true);
    try {
      // Delete existing destinations
      const { error: deleteError } = await supabase
        .from('ad_generation_schedule_destinations')
        .delete()
        .eq('schedule_id', scheduleId);

      if (deleteError) throw deleteError;

      // Insert new destinations
      if (selectedDestinations.length > 0) {
        const inserts = selectedDestinations.map(d => ({
          schedule_id: scheduleId,
          campaign_id: d.campaign_id,
          adset_id: d.adset_id,
        }));

        const { error: insertError } = await supabase
          .from('ad_generation_schedule_destinations')
          .insert(inserts);

        if (insertError) throw insertError;
      }

      toast.success('Destinos salvos com sucesso!');
    } catch (error: any) {
      console.error('Error saving destinations:', error);
      toast.error('Erro ao salvar destinos: ' + error.message);
    } finally {
      setSavingDestinations(false);
    }
  };

  const getSelectedCountForCampaign = (campaignId: string) => {
    return selectedDestinations.filter(d => d.campaign_id === campaignId).length;
  };

  const handlePromptChange = (value: string) => {
    onChange({
      ...config,
      custom_image_prompt: value || null,
    });
  };

  const getReferenceImages = (): (string | null)[] => {
    return [
      config.reference_image_1,
      config.reference_image_2,
      config.reference_image_3,
      config.reference_image_4,
      config.reference_image_5,
      config.reference_image_6,
    ];
  };

  const setReferenceImage = (index: number, url: string | null) => {
    const key = `reference_image_${index + 1}` as keyof AdvancedConfig;
    onChange({
      ...config,
      [key]: url,
    });
  };

  const handleFileUpload = async (index: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem.');
      return;
    }

    setUploadingImage(index);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `reference-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('client-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('client-files')
        .getPublicUrl(filePath);

      setReferenceImage(index, publicUrl);
      toast.success('Imagem enviada com sucesso!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao enviar imagem: ' + error.message);
    } finally {
      setUploadingImage(null);
    }
  };

  const handleReferenceSelect = (images: string[]) => {
    const currentImages = getReferenceImages();
    const newConfig = { ...config };
    let imageIndex = 0;

    for (let i = 0; i < 6 && imageIndex < images.length; i++) {
      if (!currentImages[i]) {
        const key = `reference_image_${i + 1}` as keyof AdvancedConfig;
        newConfig[key] = images[imageIndex];
        imageIndex++;
      }
    }

    onChange(newConfig);
  };

  const getEmptySlots = () => {
    return getReferenceImages().filter(img => !img).length;
  };

  const referenceImages = getReferenceImages();

  return (
    <div className="space-y-6">
      {/* Destino de Publicação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Destinos de Publicação
          </CardTitle>
          <CardDescription>
            Selecione as campanhas e conjuntos de anúncios onde os criativos aprovados serão publicados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected Destinations Summary */}
          {selectedDestinations.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Destinos selecionados ({selectedDestinations.length})</Label>
              <div className="flex flex-wrap gap-2">
                {selectedDestinations.map((dest, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1 pr-1">
                    <span className="max-w-[200px] truncate">
                      {dest.campaign_name || 'Campanha'} → {dest.adset_name || 'Conjunto'}
                    </span>
                    <button
                      onClick={() => removeDestination(dest.campaign_id, dest.adset_id)}
                      className="ml-1 p-0.5 hover:bg-destructive/20 rounded"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Campaign/AdSet Selection */}
          {loadingCampaigns ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              Nenhuma campanha ativa encontrada. Sincronize os dados do Meta.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
              {campaigns.map(campaign => {
                const isExpanded = expandedCampaigns.includes(campaign.id);
                const adSets = adSetsByCampaign[campaign.id] || [];
                const selectedCount = getSelectedCountForCampaign(campaign.id);
                const isLoading = loadingAdSets[campaign.id];

                return (
                  <div 
                    key={campaign.id}
                    className={cn(
                      "border rounded-lg overflow-hidden transition-colors",
                      selectedCount > 0 && "border-primary bg-primary/5"
                    )}
                  >
                    <Collapsible open={isExpanded} onOpenChange={() => toggleExpandCampaign(campaign.id)}>
                      <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 text-left hover:bg-muted/50">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="flex-1 font-medium truncate">{campaign.name}</span>
                        {selectedCount > 0 && (
                          <Badge variant="default" className="text-xs">
                            {selectedCount}
                          </Badge>
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-3 pb-3 space-y-1">
                          {isLoading ? (
                            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Carregando conjuntos...
                            </div>
                          ) : adSets.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2">
                              Nenhum conjunto ativo nesta campanha.
                            </p>
                          ) : (
                            adSets.map(adSet => (
                              <div 
                                key={adSet.id}
                                className={cn(
                                  "flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer",
                                  isAdSetSelected(campaign.id, adSet.id) && "bg-primary/10"
                                )}
                                onClick={() => toggleAdSet(campaign, adSet)}
                              >
                                <Checkbox
                                  checked={isAdSetSelected(campaign.id, adSet.id)}
                                  onCheckedChange={() => toggleAdSet(campaign, adSet)}
                                />
                                <span className="text-sm truncate">{adSet.name}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Os criativos aprovados serão publicados nos destinos selecionados.
            </p>
            <Button 
              onClick={saveDestinations} 
              disabled={savingDestinations || !scheduleId}
              size="sm"
            >
              {savingDestinations ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Salvar Destinos
            </Button>
          </div>

          {!scheduleId && (
            <Alert>
              <AlertDescription>
                Salve a configuração geral primeiro para poder configurar os destinos de publicação.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Prompt Personalizado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Prompt Personalizado para Imagens
          </CardTitle>
          <CardDescription>
            Instruções adicionais para a IA ao gerar as imagens dos criativos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sugestão de Prompt */}
          <Alert className="bg-amber-500/10 border-amber-500/30">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <AlertDescription className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-sm mb-1">Sugestão de prompt:</p>
                <p className="text-xs text-muted-foreground italic">
                  "{SUGGESTED_PROMPT}"
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handlePromptChange(SUGGESTED_PROMPT);
                  toast.success("Prompt sugerido aplicado!");
                }}
                className="shrink-0"
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Usar
              </Button>
            </AlertDescription>
          </Alert>

          <Textarea
            placeholder="Ex: Usar cores vibrantes e modernas, foco em pessoas sorrindo, estilo minimalista, incluir o produto em destaque..."
            value={config.custom_image_prompt || ''}
            onChange={(e) => handlePromptChange(e.target.value)}
            rows={4}
          />
          <p className="text-sm text-muted-foreground">
            Este prompt será somado ao prompt padrão de geração de imagens. Use para definir estilos visuais específicos, direções criativas ou elementos que devem aparecer em todos os criativos.
          </p>
        </CardContent>
      </Card>

      {/* Imagens de Referência */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Imagens de Referência
          </CardTitle>
          <CardDescription>
            Até 6 imagens para a IA usar como referência visual (têm prioridade sobre as imagens do cliente)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {referenceImages.map((image, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 overflow-hidden group"
              >
                {image ? (
                  <>
                    <img
                      src={image}
                      alt={`Referência ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => setReferenceImage(index, null)}
                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 text-center">
                      Ref {index + 1}
                    </div>
                  </>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-muted/50 transition-colors">
                    {uploadingImage === index ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">Upload</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(index, file);
                      }}
                      disabled={uploadingImage !== null}
                    />
                  </label>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowReferenceDialog(true)}
              disabled={getEmptySlots() === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Selecionar do Meta/Instagram ({getEmptySlots()} slots disponíveis)
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Estas imagens serão usadas como referência visual para gerar os criativos. Se não configuradas, a IA usará as imagens de referência do cadastro do cliente.
          </p>
        </CardContent>
      </Card>

      {/* Reference Selection Dialog */}
      {activeCompany?.company_id && (
        <ReferenceSelectionDialog
          open={showReferenceDialog}
          onOpenChange={setShowReferenceDialog}
          clientId={clientId}
          instagramAccountId={instagramAccountId || undefined}
          companyId={activeCompany.company_id}
          onSelect={handleReferenceSelect}
          maxSelections={getEmptySlots()}
        />
      )}
    </div>
  );
}
