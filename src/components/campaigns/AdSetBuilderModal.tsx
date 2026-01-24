import { useEffect, useMemo, useState } from 'react';
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
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Layers } from 'lucide-react';
import { useAdSetBuilder } from '@/hooks/useAdSetBuilder';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { AudienceMultiSelect } from '@/components/campaigns/builder/AudienceMultiSelect';
import { PixelSelector } from '@/components/campaigns/builder/PixelSelector';
import { ConversionEventSelector } from '@/components/campaigns/builder/ConversionEventSelector';
import { InterestSelector, Interest } from '@/components/campaigns/builder/InterestSelector';

interface MetaCampaign {
  id: string;
  name: string;
  facebook_id: string;
  objective: string | null;
  is_active: boolean;
}

interface AdSetBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  companyId: string;
  preSelectedCampaignId?: string;
  onSuccess?: () => void;
}

export function AdSetBuilderModal({
  isOpen,
  onClose,
  clientId,
  companyId,
  preSelectedCampaignId,
  onSuccess,
}: AdSetBuilderModalProps) {
  const { state, updateField, reset, submit, isSubmitting } = useAdSetBuilder(clientId, companyId);

  // Fetch Meta campaigns with facebook_id and objective
  const { data: campaigns = [] } = useQuery({
    queryKey: ['meta-campaigns-for-adset', clientId, companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name, facebook_id, objective, is_active')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .not('facebook_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as MetaCampaign[];
    },
    enabled: !!clientId,
  });

  // Set pre-selected campaign
  useEffect(() => {
    if (preSelectedCampaignId && isOpen) {
      const campaign = campaigns.find(c => c.id === preSelectedCampaignId);
      if (campaign && campaign.facebook_id) {
        updateField('campaignId', campaign.id);
        updateField('metaCampaignId', campaign.facebook_id);
      }
    }
  }, [preSelectedCampaignId, campaigns, isOpen, updateField]);

  // Get selected campaign objective
  const selectedCampaign = useMemo(() => {
    return campaigns.find(c => c.id === state.campaignId);
  }, [campaigns, state.campaignId]);

  const handleCampaignChange = (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    updateField('campaignId', campaignId);
    updateField('metaCampaignId', campaign?.facebook_id || '');
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Novo Conjunto de Anúncios
          </DialogTitle>
          <DialogDescription>
            Crie um novo conjunto de anúncios dentro de uma campanha existente no Meta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Campaign Selection */}
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
            {campaigns.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhuma campanha Meta ativa encontrada. Crie uma campanha primeiro.
              </p>
            )}
          </div>

          {/* Ad Set Name */}
          <div className="space-y-2">
            <Label>Nome do Conjunto *</Label>
            <Input
              value={state.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Ex: Público Lookalike - 18-35"
            />
          </div>

          {/* Daily Budget */}
          <div className="space-y-2">
            <Label>Orçamento Diário (R$)</Label>
            <Input
              type="number"
              min={1}
              value={state.dailyBudget}
              onChange={(e) => updateField('dailyBudget', Number(e.target.value))}
              placeholder="50"
            />
          </div>

          {/* Targeting Section */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm">Segmentação</h4>

            {/* Included Audiences */}
            <AudienceMultiSelect
              clientId={clientId}
              selectedIds={state.includedAudiences}
              onChange={(ids) => updateField('includedAudiences', ids)}
              label="Públicos de Inclusão"
              placeholder="Selecionar públicos..."
            />

            {/* Excluded Audiences */}
            <AudienceMultiSelect
              clientId={clientId}
              selectedIds={state.excludedAudiences}
              onChange={(ids) => updateField('excludedAudiences', ids)}
              label="Públicos de Exclusão"
              placeholder="Excluir públicos..."
            />

            {/* Interests */}
            <InterestSelector
              clientId={clientId}
              selectedInterests={state.interests}
              onChange={(interests) => updateField('interests', interests)}
              label="Interesses"
              placeholder="Buscar interesses..."
            />
          </div>

          {/* Demographics Section */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm">Demografia</h4>

            {/* Age Range */}
            <div className="space-y-3">
              <Label>Faixa Etária: {state.ageMin} - {state.ageMax} anos</Label>
              <div className="px-2">
                <Slider
                  min={18}
                  max={65}
                  step={1}
                  value={[state.ageMin, state.ageMax]}
                  onValueChange={([min, max]) => {
                    updateField('ageMin', min);
                    updateField('ageMax', max);
                  }}
                />
              </div>
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label>Gênero</Label>
              <Select
                value={state.genders.length === 0 ? 'all' : state.genders[0].toString()}
                onValueChange={(v) => {
                  if (v === 'all') {
                    updateField('genders', []);
                  } else {
                    updateField('genders', [Number(v)]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="1">Masculino</SelectItem>
                  <SelectItem value="2">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conversion Section */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm">Conversão (opcional)</h4>

            <PixelSelector
              clientId={clientId}
              companyId={companyId}
              value={state.pixelId}
              onChange={(v) => updateField('pixelId', v)}
            />

            <ConversionEventSelector
              value={state.conversionEvent}
              onChange={(v) => updateField('conversionEvent', v)}
              disabled={!state.pixelId}
              campaignObjective={selectedCampaign?.objective || undefined}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !state.campaignId || !state.name.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Conjunto'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
