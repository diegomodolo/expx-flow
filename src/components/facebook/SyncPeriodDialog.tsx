import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Calendar, Info, Loader2, Database, Target, Image, UserX, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSyncJobStatus } from '@/hooks/useSyncJobStatus';

export interface SyncOptions {
  period: string;
  campaigns: boolean;
  adsets: boolean;
  ads: boolean;
  includeInactive: boolean;
}

interface SyncPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: SyncOptions) => Promise<string | null>;
  syncing?: boolean;
  title?: string;
  jobId?: string | null;
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
  title = "Configurar Sincronização",
  jobId = null
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');
  const [syncCampaigns, setSyncCampaigns] = useState<boolean>(true);
  const [syncAdSets, setSyncAdSets] = useState<boolean>(true);
  const [syncAds, setSyncAds] = useState<boolean>(true);
  const [includeInactive, setIncludeInactive] = useState<boolean>(false);
  const [internalJobId, setInternalJobId] = useState<string | null>(null);
  
  const { job, progressPercentage, isComplete, isError, isProcessing } = useSyncJobStatus(internalJobId || jobId);

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
        setIncludeInactive(options.includeInactive || false);
      } catch (error) {
        console.error('Error loading sync options:', error);
      }
    }
  }, []);

  const handleConfirm = async () => {
    const options: SyncOptions = {
      period: selectedPeriod,
      campaigns: syncCampaigns,
      adsets: syncAdSets,
      ads: syncAds,
      includeInactive: includeInactive
    };
    
    // Save selected options to localStorage
    localStorage.setItem('lastSyncOptions', JSON.stringify(options));
    
    // Capture the returned jobId and keep modal open to show progress
    const returnedJobId = await onConfirm(options);
    if (returnedJobId) {
      setInternalJobId(returnedJobId);
    }
  };

  const handleContinueInBackground = () => {
    onOpenChange(false);
  };

  // Reset internal jobId when modal closes
  useEffect(() => {
    if (!open) {
      setInternalJobId(null);
    }
  }, [open]);

  // Auto-close when completed successfully
  useEffect(() => {
    if (isComplete && open) {
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    }
  }, [isComplete, open, onOpenChange]);

  const selectedOption = periodOptions.find(option => option.value === selectedPeriod);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
            {isComplete && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            {isError && <AlertCircle className="h-4 w-4 text-destructive" />}
            {!isProcessing && !isComplete && !isError && title}
            {isProcessing && "Sincronizando Dados"}
            {isComplete && "Sincronização Concluída"}
            {isError && "Erro na Sincronização"}
          </DialogTitle>
          <DialogDescription>
            {!isProcessing && !isComplete && !isError && "Escolha o período de dados que deseja sincronizar do Facebook"}
            {isProcessing && "Aguarde enquanto processamos os dados..."}
            {isComplete && "Dados sincronizados com sucesso!"}
            {isError && job?.error_message}
          </DialogDescription>
        </DialogHeader>
        
        {isProcessing && job && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Progresso Geral</span>
                <span className="text-muted-foreground">{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {job.progress.current_entity && (
              <div className="text-center py-2 px-3 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground mb-1">Processando:</p>
                <p className="text-sm font-medium">{job.progress.current_entity}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 text-sm">
              {job.progress.campaigns.total > 0 && (
                <div className="text-center p-2 bg-muted/50 rounded">
                  <p className="text-muted-foreground mb-1">Campanhas</p>
                  <p className="font-medium">{job.progress.campaigns.current}/{job.progress.campaigns.total}</p>
                </div>
              )}
              {job.progress.adsets.total > 0 && (
                <div className="text-center p-2 bg-muted/50 rounded">
                  <p className="text-muted-foreground mb-1">Ad Sets</p>
                  <p className="font-medium">{job.progress.adsets.current}/{job.progress.adsets.total}</p>
                </div>
              )}
              {job.progress.ads.total > 0 && (
                <div className="text-center p-2 bg-muted/50 rounded">
                  <p className="text-muted-foreground mb-1">Anúncios</p>
                  <p className="font-medium">{job.progress.ads.current}/{job.progress.ads.total}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {!isProcessing && !isComplete && !isError && (
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
                <div className="flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      {selectedOption.label}
                    </p>
                    <p className="text-blue-700 dark:text-blue-300">
                      {selectedOption.description}
                    </p>
                    {selectedOption.value === '30' && (
                      <p className="text-blue-600 dark:text-blue-400 mt-1">
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

                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Checkbox 
                    id="include-inactive"
                    checked={includeInactive}
                    onCheckedChange={(checked) => setIncludeInactive(checked === true)}
                  />
                  <div className="flex items-center space-x-2 flex-1">
                    <UserX className="w-4 h-4 text-red-600" />
                    <div className="flex-1">
                      <Label htmlFor="include-inactive" className="cursor-pointer font-medium">
                        Incluir clientes inativos
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Sincronizar também clientes marcados como inativos
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {!syncCampaigns && !syncAdSets && !syncAds && (
                <div className="flex items-start space-x-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Selecione pelo menos um tipo de dados para sincronizar.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {!isProcessing && !isComplete && (
            <>
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirm}
                disabled={isProcessing || (!syncCampaigns && !syncAdSets && !syncAds)}
              >
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sincronizar
              </Button>
            </>
          )}
          
          {isProcessing && (
            <Button 
              variant="outline" 
              onClick={handleContinueInBackground}
            >
              Continuar em Background
            </Button>
          )}

          {(isComplete || isError) && (
            <Button onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};