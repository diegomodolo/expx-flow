import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar, Info, Loader2 } from 'lucide-react';

interface SyncPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (period: string) => void;
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
  title = "Selecionar Período de Sincronização"
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');

  // Load last selected period from localStorage
  useEffect(() => {
    const lastPeriod = localStorage.getItem('lastSyncPeriod');
    if (lastPeriod) {
      setSelectedPeriod(lastPeriod);
    }
  }, []);

  const handleConfirm = () => {
    // Save selected period to localStorage
    localStorage.setItem('lastSyncPeriod', selectedPeriod);
    onConfirm(selectedPeriod);
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
        
        <div className="space-y-4">
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
          </div>

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
              disabled={syncing}
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