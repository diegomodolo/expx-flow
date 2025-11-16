import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Calendar, Info, Loader2, Database, Target, Image, UserX } from 'lucide-react';
import { useFacebookCampaignSync } from '@/hooks/useFacebookCampaignSync';
import { useGoogleAdsCampaignSync } from '@/hooks/useGoogleAdsCampaignSync';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UnifiedSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

type Platform = 'meta' | 'google' | 'both';

const periodOptions = [
  { value: '7', label: '7 dias', description: 'Últimos 7 dias' },
  { value: '15', label: '15 dias', description: 'Últimos 15 dias' },
  { value: '30', label: '30 dias', description: 'Últimos 30 dias (recomendado)' },
  { value: '90', label: '90 dias', description: 'Últimos 90 dias' },
  { value: 'lifetime', label: 'Máximo', description: 'Desde o início das campanhas' },
];

const convertPeriodToGoogle = (period: string): string => {
  if (period === 'lifetime') return 'last_90_days'; // Google não tem lifetime
  return `last_${period}_days`;
};

export const UnifiedSyncDialog: React.FC<UnifiedSyncDialogProps> = ({
  open,
  onOpenChange,
  companyId,
}) => {
  const [platform, setPlatform] = useState<Platform>('both');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');
  const [syncCampaigns, setSyncCampaigns] = useState<boolean>(true);
  const [syncAdSetsOrGroups, setSyncAdSetsOrGroups] = useState<boolean>(true);
  const [syncAds, setSyncAds] = useState<boolean>(true);
  const [includeInactive, setIncludeInactive] = useState<boolean>(false);
  const [clientCounts, setClientCounts] = useState({ meta: 0, google: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentStage, setCurrentStage] = useState<'meta' | 'google' | null>(null);

  const { syncAllClients: syncMetaClients, progress: metaProgress } = useFacebookCampaignSync();
  const { syncAllClients: syncGoogleClients, progress: googleProgress } = useGoogleAdsCampaignSync();

  // Load last selected options from localStorage
  useEffect(() => {
    const lastOptions = localStorage.getItem('lastUnifiedSyncOptions');
    if (lastOptions) {
      try {
        const options = JSON.parse(lastOptions);
        setPlatform(options.platform || 'both');
        setSelectedPeriod(options.period || '30');
        setSyncCampaigns(options.campaigns !== false);
        setSyncAdSetsOrGroups(options.adSetsOrGroups !== false);
        setSyncAds(options.ads !== false);
        setIncludeInactive(options.includeInactive || false);
      } catch (error) {
        console.error('Error loading sync options:', error);
      }
    }
  }, []);

  // Fetch client counts
  useEffect(() => {
    const fetchCounts = async () => {
      if (!open || !companyId) return;

      const { data } = await supabase
        .from('clients')
        .select('ad_account_id, google_account_id')
        .eq('company_id', companyId);

      const meta = data?.filter(c => c.ad_account_id).length || 0;
      const google = data?.filter(c => c.google_account_id).length || 0;

      setClientCounts({ meta, google });
    };

    fetchCounts();
  }, [open, companyId]);

  const getAdSetsLabel = () => {
    if (platform === 'google') return 'Grupos de Anúncios';
    if (platform === 'meta') return 'Conjuntos de Anúncio';
    return 'Conjuntos/Grupos de Anúncios';
  };

  const getClientCountMessage = () => {
    if (platform === 'meta') {
      return `Serão sincronizados ${clientCounts.meta} cliente${clientCounts.meta !== 1 ? 's' : ''} com Meta Ads`;
    }
    if (platform === 'google') {
      return `Serão sincronizados ${clientCounts.google} cliente${clientCounts.google !== 1 ? 's' : ''} com Google Ads`;
    }
    return `Serão sincronizados ${clientCounts.meta} cliente${clientCounts.meta !== 1 ? 's' : ''} Meta e ${clientCounts.google} cliente${clientCounts.google !== 1 ? 's' : ''} Google`;
  };

  const canSync = () => {
    if (platform === 'meta') return clientCounts.meta > 0;
    if (platform === 'google') return clientCounts.google > 0;
    return clientCounts.meta > 0 || clientCounts.google > 0;
  };

  const handleConfirm = async () => {
    // Save options to localStorage
    const options = {
      platform,
      period: selectedPeriod,
      campaigns: syncCampaigns,
      adSetsOrGroups: syncAdSetsOrGroups,
      ads: syncAds,
      includeInactive,
    };
    localStorage.setItem('lastUnifiedSyncOptions', JSON.stringify(options));

    setIsSyncing(true);

    try {
      if (platform === 'meta' || platform === 'both') {
        setCurrentStage('meta');
        await syncMetaClients({
          period: selectedPeriod,
          campaigns: syncCampaigns,
          adsets: syncAdSetsOrGroups,
          ads: syncAds,
          includeInactive,
        });
      }

      if (platform === 'google' || platform === 'both') {
        setCurrentStage('google');
        await syncGoogleClients(companyId, {
          period: convertPeriodToGoogle(selectedPeriod),
          syncCampaigns,
          syncAdGroups: syncAdSetsOrGroups,
          syncAds,
          includeInactive,
          excludeInactiveClients: true,
        });
      }

      toast.success('Sincronização concluída com sucesso!');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(`Erro durante sincronização: ${error.message}`);
    } finally {
      setIsSyncing(false);
      setCurrentStage(null);
    }
  };

  const getCurrentProgress = () => {
    if (!isSyncing) return 0;

    if (platform === 'meta') {
      return metaProgress.total > 0 ? (metaProgress.current / metaProgress.total) * 100 : 0;
    }

    if (platform === 'google') {
      return googleProgress.total > 0 ? (googleProgress.current / googleProgress.total) * 100 : 0;
    }

    // Both platforms
    const totalClients = clientCounts.meta + clientCounts.google;
    if (totalClients === 0) return 0;

    if (currentStage === 'meta') {
      const metaDone = metaProgress.total > 0 ? metaProgress.current / metaProgress.total : 0;
      return (metaDone * clientCounts.meta / totalClients) * 100;
    } else if (currentStage === 'google') {
      const metaDone = clientCounts.meta / totalClients;
      const googleDone = googleProgress.total > 0 ? googleProgress.current / googleProgress.total : 0;
      return (metaDone + (googleDone * clientCounts.google / totalClients)) * 100;
    }

    return 0;
  };

  const getProgressMessage = () => {
    if (!isSyncing) return '';

    if (platform === 'meta') {
      return `Sincronizando Meta Ads... (${metaProgress.current}/${metaProgress.total})`;
    }

    if (platform === 'google') {
      return `Sincronizando Google Ads... (${googleProgress.current}/${googleProgress.total})`;
    }

    // Both platforms
    if (currentStage === 'meta') {
      return `Sincronizando Meta Ads... (${metaProgress.current}/${metaProgress.total})`;
    } else if (currentStage === 'google') {
      return `Meta Ads ✓ | Sincronizando Google Ads... (${googleProgress.current}/${googleProgress.total})`;
    }

    return 'Iniciando sincronização...';
  };

  const selectedOption = periodOptions.find(option => option.value === selectedPeriod);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Sincronizar Campanhas
          </DialogTitle>
          <DialogDescription>
            Configure as opções de sincronização de dados das suas plataformas de anúncios
          </DialogDescription>
        </DialogHeader>

        {isSyncing ? (
          <div className="space-y-4 py-6">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {getProgressMessage()}
            </div>
            <Progress value={getCurrentProgress()} className="w-full" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Platform Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Target className="h-4 w-4" />
                Selecione as Plataformas
              </Label>
              <RadioGroup value={platform} onValueChange={(value) => setPlatform(value as Platform)}>
                <div className="flex items-center space-x-2 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="meta" id="meta" />
                  <Label htmlFor="meta" className="flex-1 cursor-pointer">
                    Meta Ads
                    <span className="text-xs text-muted-foreground ml-2">
                      ({clientCounts.meta} cliente{clientCounts.meta !== 1 ? 's' : ''})
                    </span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="google" id="google" />
                  <Label htmlFor="google" className="flex-1 cursor-pointer">
                    Google Ads
                    <span className="text-xs text-muted-foreground ml-2">
                      ({clientCounts.google} cliente{clientCounts.google !== 1 ? 's' : ''})
                    </span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="both" id="both" />
                  <Label htmlFor="both" className="flex-1 cursor-pointer">
                    Ambas as plataformas
                    <span className="text-xs text-muted-foreground ml-2">
                      (Meta + Google)
                    </span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Period Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Período de Sincronização
              </Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedOption && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {selectedOption.description}
                </p>
              )}
            </div>

            {/* Sync Options */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">O que sincronizar</Label>
              <div className="space-y-3 rounded-lg border border-border p-4 bg-accent/20">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="campaigns"
                    checked={syncCampaigns}
                    onCheckedChange={(checked) => setSyncCampaigns(checked as boolean)}
                  />
                  <Label htmlFor="campaigns" className="flex items-center gap-2 cursor-pointer">
                    <Target className="h-3.5 w-3.5" />
                    Campanhas
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="adsets"
                    checked={syncAdSetsOrGroups}
                    onCheckedChange={(checked) => setSyncAdSetsOrGroups(checked as boolean)}
                  />
                  <Label htmlFor="adsets" className="flex items-center gap-2 cursor-pointer">
                    <Database className="h-3.5 w-3.5" />
                    {getAdSetsLabel()}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ads"
                    checked={syncAds}
                    onCheckedChange={(checked) => setSyncAds(checked as boolean)}
                  />
                  <Label htmlFor="ads" className="flex items-center gap-2 cursor-pointer">
                    <Image className="h-3.5 w-3.5" />
                    Criativos / Anúncios
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="inactive"
                    checked={includeInactive}
                    onCheckedChange={(checked) => setIncludeInactive(checked as boolean)}
                  />
                  <Label htmlFor="inactive" className="flex items-center gap-2 cursor-pointer">
                    <UserX className="h-3.5 w-3.5" />
                    Incluir campanhas inativas
                  </Label>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3">
              <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                {getClientCountMessage()}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSyncing}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isSyncing || !canSync()}>
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              'Iniciar Sincronização'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
