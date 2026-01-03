import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Target, Wand2, ImageIcon, Upload, X, Loader2, Plus } from "lucide-react";
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
  config: AdvancedConfig;
  onChange: (config: AdvancedConfig) => void;
}

export function FabricaConfiguracoesAvancadas({ clientId, config, onChange }: Props) {
  const { activeCompany } = useCompany();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingAdSets, setLoadingAdSets] = useState(false);
  const [showReferenceDialog, setShowReferenceDialog] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);
  const [instagramAccountId, setInstagramAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (clientId) {
      loadCampaigns();
      loadClientInstagramId();
    }
  }, [clientId]);

  // Load ad sets when campaign changes OR on initial load if campaign is already set
  useEffect(() => {
    if (config.target_campaign_id) {
      console.log('Loading ad sets for campaign:', config.target_campaign_id);
      loadAdSets(config.target_campaign_id);
    } else {
      setAdSets([]);
    }
  }, [config.target_campaign_id, clientId]);

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
    setLoadingAdSets(true);
    try {
      console.log('Fetching ad sets for campaign_id:', campaignId);
      const { data, error } = await supabase
        .from('ad_sets')
        .select('id, name, facebook_id, campaign_id')
        .eq('campaign_id', campaignId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      console.log('Ad sets loaded:', data?.length || 0, 'items', data);
      setAdSets(data || []);
    } catch (error) {
      console.error('Error loading ad sets:', error);
    } finally {
      setLoadingAdSets(false);
    }
  };

  const handleCampaignChange = (value: string) => {
    onChange({
      ...config,
      target_campaign_id: value === 'none' ? null : value,
      target_adset_id: null, // Reset ad set when campaign changes
    });
  };

  const handleAdSetChange = (value: string) => {
    onChange({
      ...config,
      target_adset_id: value === 'none' ? null : value,
    });
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
    // Find empty slots and fill them
    const currentImages = getReferenceImages();
    let imageIndex = 0;

    for (let i = 0; i < 6 && imageIndex < images.length; i++) {
      if (!currentImages[i]) {
        setReferenceImage(i, images[imageIndex]);
        imageIndex++;
      }
    }
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
            Destino de Publicação
          </CardTitle>
          <CardDescription>
            Defina em qual campanha e conjunto de anúncios os criativos aprovados serão publicados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Campanha</Label>
              <Select
                value={config.target_campaign_id || 'none'}
                onValueChange={handleCampaignChange}
                disabled={loadingCampaigns}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma campanha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (não publicar)</SelectItem>
                  {campaigns.map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {campaigns.length === 0 && !loadingCampaigns && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma campanha ativa encontrada. Sincronize os dados do Meta.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Conjunto de Anúncios</Label>
              <Select
                value={config.target_adset_id || 'none'}
                onValueChange={handleAdSetChange}
                disabled={!config.target_campaign_id || loadingAdSets}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um conjunto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {adSets.map(adSet => (
                    <SelectItem key={adSet.id} value={adSet.id}>
                      {adSet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {config.target_campaign_id && adSets.length === 0 && !loadingAdSets && (
                <p className="text-xs text-muted-foreground">
                  Nenhum conjunto ativo nesta campanha.
                </p>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Os criativos aprovados (manualmente ou pelo autopilot) serão publicados automaticamente nesta campanha e conjunto de anúncios.
          </p>
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
