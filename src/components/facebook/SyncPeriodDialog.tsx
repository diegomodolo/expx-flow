import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Info, Loader2, Database, Target, Image } from 'lucide-react';

export interface SyncOptions {
  period: string;
  campaigns: boolean;
  adsets: boolean;
  ads: boolean;
}

interface SyncPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: SyncOptions) => void;
  syncing?: boolean;
  title?: string;
}

const periodOptions = [
  { value: '7', label: '7 dias', description: 'Últimos 7 dias' },
  { value: '15', label: '15 dias', description: 'Últimos 15 dias' },
  { value: '30', label: '30 dias', description: 'Últimos 30 dias (recomendado)' },
  { value: '90', label: '90 dias', description: 'Últimos 90 dias' },
  { value: 'lifetime', label: 'Máximo', description: 'Desde o início das campanhas' },
];

export const SyncPeriodDialog: React.FC<SyncPeriodDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  syncing = false,
  title = "Configurar Sincronização"
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');
  const [syncCampaigns, setSyncCampaigns] = useState<boolean>(true);
  const [syncAdSets, setSyncAdSets] = useState<boolean>(true);
  const [syncAds, setSyncAds] = useState<boolean>(true);

  // Load last selected options from localStorage
  useEffect(() => {
    const lastOptions = localStorage.getItem('lastSyncOptions');
    if (lastOptions) {
      try {
        const options = JSON.parse(lastOptions);
        setSelectedPeriod(options.period || '30');
        setSyncCampaigns(options.campaigns !== false);
        setSyncAdSets(options.adsets !== false);
        setSyncAds(options.ads !== false);
      } catch (error) {
        console.error('Error loading sync options:', error);
      }
    }
  }, []);

  const handleConfirm = () => {
    const options: SyncOptions = {
      period: selectedPeriod,
      campaigns: syncCampaigns,
      adsets: syncAdSets,
      ads: syncAds
    };
    
    // Save selected options to localStorage
    localStorage.setItem('lastSyncOptions', JSON.stringify(options));
    onConfirm(options);
  };

  const selectedOption = periodOptions.find(option => option.value === selectedPeriod);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>{title}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Período */}
          <div className="space-y-2">
            <Label htmlFor="period-select">Período dos dados</Label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedOption && (
              <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">
                    {selectedOption.label}
                  </p>
                  <p className="text-blue-700">
                    {selectedOption.description}
                  </p>
                  {selectedOption.value === '30' && (
                    <p className="text-blue-600 mt-1">
                      Período recomendado para análises mensais consistentes.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tipos de dados para sincronizar */}
          <div className="space-y-3">
            <Label>Dados para sincronizar</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Checkbox 
                  id="sync-campaigns"
                  checked={syncCampaigns}
                  onCheckedChange={(checked) => setSyncCampaigns(checked === true)}
                />
                <div className="flex items-center space-x-2 flex-1">
                  <Database className="w-4 h-4 text-blue-600" />
                  <div className="flex-1">
                    <Label htmlFor="sync-campaigns" className="cursor-pointer font-medium">
                      Campanhas
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Dados das campanhas publicitárias
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Checkbox 
                  id="sync-adsets"
                  checked={syncAdSets}
                  onCheckedChange={(checked) => setSyncAdSets(checked === true)}
                />
                <div className="flex items-center space-x-2 flex-1">
                  <Target className="w-4 h-4 text-green-600" />
                  <div className="flex-1">
                    <Label htmlFor="sync-adsets" className="cursor-pointer font-medium">
                      Conjuntos de Anúncios
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Segmentações e configurações de público
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Checkbox 
                  id="sync-ads"
                  checked={syncAds}
                  onCheckedChange={(checked) => setSyncAds(checked === true)}
                />
                <div className="flex items-center space-x-2 flex-1">
                  <Image className="w-4 h-4 text-purple-600" />
                  <div className="flex-1">
                    <Label htmlFor="sync-ads" className="cursor-pointer font-medium">
                      Criativos
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Anúncios individuais e criativos
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {!syncCampaigns && !syncAdSets && !syncAds && (
              <div className="flex items-start space-x-2 p-3 bg-amber-50 rounded-lg">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-700">
                  Selecione pelo menos um tipo de dados para sincronizar.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={syncing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={syncing || (!syncCampaigns && !syncAdSets && !syncAds)}
              className="flex items-center space-x-2"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sincronizando...</span>
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  <span>Sincronizar</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};