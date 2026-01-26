import { useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Loader2, Image, Video, LayoutGrid } from 'lucide-react';
import { useCreativeBuilder } from '@/hooks/useCreativeBuilder';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { MediaUploader } from '@/components/campaigns/builder/MediaUploader';

interface MetaCampaign {
  id: string;
  name: string;
  facebook_id: string;
  is_active: boolean;
}

interface MetaAdSet {
  id: string;
  name: string;
  facebook_id: string;
  campaign_id: string;
  is_active: boolean;
}

interface CreativeBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  companyId: string;
  clientName?: string;
  preSelectedCampaignId?: string;
  preSelectedAdSetId?: string;
  onSuccess?: () => void;
}

const CTA_OPTIONS = [
  { value: 'LEARN_MORE', label: 'Saiba Mais' },
  { value: 'SHOP_NOW', label: 'Comprar Agora' },
  { value: 'SIGN_UP', label: 'Cadastre-se' },
  { value: 'DOWNLOAD', label: 'Download' },
  { value: 'CONTACT_US', label: 'Fale Conosco' },
  { value: 'BOOK_NOW', label: 'Reservar Agora' },
  { value: 'GET_OFFER', label: 'Obter Oferta' },
  { value: 'SUBSCRIBE', label: 'Inscreva-se' },
  { value: 'WATCH_MORE', label: 'Assistir Mais' },
  { value: 'APPLY_NOW', label: 'Candidate-se' },
];

export function CreativeBuilderModal({
  isOpen,
  onClose,
  clientId,
  companyId,
  clientName,
  preSelectedCampaignId,
  preSelectedAdSetId,
  onSuccess,
}: CreativeBuilderModalProps) {
  const { state, updateField, reset, submit, isSubmitting } = useCreativeBuilder(clientId, companyId);

  // Fetch Meta campaigns
  const { data: campaigns = [] } = useQuery({
    queryKey: ['meta-campaigns-for-creative', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name, facebook_id, is_active')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .not('facebook_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as MetaCampaign[];
    },
    enabled: !!clientId,
  });

  // Fetch ad sets for selected campaign
  const { data: adSets = [] } = useQuery({
    queryKey: ['meta-adsets-for-creative', clientId, state.campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_sets')
        .select('id, name, facebook_id, campaign_id, is_active')
        .eq('client_id', clientId)
        .eq('campaign_id', state.campaignId)
        .eq('is_active', true)
        .not('facebook_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as MetaAdSet[];
    },
    enabled: !!clientId && !!state.campaignId,
  });

  // Set pre-selected values
  useEffect(() => {
    if (isOpen) {
      if (preSelectedCampaignId) {
        updateField('campaignId', preSelectedCampaignId);
      }
    }
  }, [preSelectedCampaignId, isOpen, updateField]);

  useEffect(() => {
    if (isOpen && preSelectedAdSetId && adSets.length > 0) {
      const adSet = adSets.find(a => a.id === preSelectedAdSetId);
      if (adSet && adSet.facebook_id) {
        updateField('adSetId', adSet.id);
        updateField('metaAdSetId', adSet.facebook_id);
      }
    }
  }, [preSelectedAdSetId, adSets, isOpen, updateField]);

  const handleCampaignChange = (campaignId: string) => {
    updateField('campaignId', campaignId);
    updateField('adSetId', '');
    updateField('metaAdSetId', '');
  };

  const handleAdSetChange = (adSetId: string) => {
    const adSet = adSets.find(a => a.id === adSetId);
    updateField('adSetId', adSetId);
    updateField('metaAdSetId', adSet?.facebook_id || '');
  };

  const handleSubmit = async () => {
    const result = await submit();
    if (result) {
      onSuccess?.();
      onClose();
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const maxFiles = state.type === 'CAROUSEL' ? 10 : 1;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Novo Criativo
          </DialogTitle>
          <DialogDescription>
            Crie um novo criativo/anúncio dentro de um conjunto de anúncios existente no Meta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Campaign Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Campanha *</Label>
              <Select value={state.campaignId} onValueChange={handleCampaignChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma campanha..." />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Conjunto de Anúncios *</Label>
              <Select 
                value={state.adSetId} 
                onValueChange={handleAdSetChange}
                disabled={!state.campaignId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um conjunto..." />
                </SelectTrigger>
                <SelectContent>
                  {adSets.map(adSet => (
                    <SelectItem key={adSet.id} value={adSet.id}>
                      {adSet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.campaignId && adSets.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum conjunto ativo nesta campanha.
                </p>
              )}
            </div>
          </div>

          {/* Creative Type */}
          <div className="space-y-2">
            <Label>Tipo de Criativo</Label>
            <ToggleGroup 
              type="single" 
              value={state.type} 
              onValueChange={(v) => v && updateField('type', v as 'IMAGE' | 'VIDEO' | 'CAROUSEL')}
              className="justify-start"
            >
              <ToggleGroupItem value="IMAGE" aria-label="Imagem">
                <Image className="w-4 h-4 mr-2" />
                Imagem
              </ToggleGroupItem>
              <ToggleGroupItem value="VIDEO" aria-label="Vídeo">
                <Video className="w-4 h-4 mr-2" />
                Vídeo
              </ToggleGroupItem>
              <ToggleGroupItem value="CAROUSEL" aria-label="Carrossel">
                <LayoutGrid className="w-4 h-4 mr-2" />
                Carrossel
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Media Upload */}
          <div className="space-y-2">
            <Label>Mídia *</Label>
            <MediaUploader
              mediaUrls={state.mediaUrls}
              onChange={(urls) => updateField('mediaUrls', urls)}
              type={state.type}
              maxFiles={maxFiles}
              clientId={clientId}
              companyId={companyId}
            />
          </div>

          {/* Creative Text */}
          <div className="space-y-2">
            <Label>Texto Principal *</Label>
            <Textarea
              value={state.body}
              onChange={(e) => updateField('body', e.target.value)}
              placeholder="Texto principal do anúncio..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {state.body.length}/125 caracteres (recomendado)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={state.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Título do anúncio"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={state.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Descrição adicional"
              />
            </div>
          </div>

          {/* Link and CTA */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>URL de Destino *</Label>
              <Input
                value={state.linkUrl}
                onChange={(e) => updateField('linkUrl', e.target.value)}
                placeholder="https://..."
                type="url"
              />
            </div>
            <div className="space-y-2">
              <Label>Call to Action</Label>
              <Select value={state.callToAction} onValueChange={(v) => updateField('callToAction', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CTA_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* UTM Parameters */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm">Parâmetros UTM (opcional)</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">utm_source</Label>
                <Input
                  value={state.urlParameters.utm_source || ''}
                  onChange={(e) => updateField('urlParameters', { ...state.urlParameters, utm_source: e.target.value })}
                  placeholder="facebook"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">utm_medium</Label>
                <Input
                  value={state.urlParameters.utm_medium || ''}
                  onChange={(e) => updateField('urlParameters', { ...state.urlParameters, utm_medium: e.target.value })}
                  placeholder="paid"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">utm_campaign</Label>
                <Input
                  value={state.urlParameters.utm_campaign || ''}
                  onChange={(e) => updateField('urlParameters', { ...state.urlParameters, utm_campaign: e.target.value })}
                  placeholder="campanha"
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !state.adSetId || !state.body.trim() || !state.linkUrl.trim() || state.mediaUrls.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Criativo'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
