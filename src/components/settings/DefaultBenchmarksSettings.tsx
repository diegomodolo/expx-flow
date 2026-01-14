import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDefaultBenchmarks, SYSTEM_DEFAULTS, DefaultBenchmarks } from '@/hooks/useDefaultBenchmarks';
import { Save, RotateCcw, DollarSign, Percent, Target, TrendingUp, MousePointerClick, Eye, RefreshCw, Users } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface MetricField {
  key: keyof DefaultBenchmarks;
  label: string;
  icon: React.ReactNode;
  suffix: string;
  description: string;
  step?: string;
}

const metricFields: MetricField[] = [
  {
    key: 'default_target_cpa',
    label: 'CPA (Custo por Aquisição)',
    icon: <DollarSign className="h-4 w-4" />,
    suffix: 'R$',
    description: 'Custo máximo aceitável por conversão',
  },
  {
    key: 'default_target_cpl',
    label: 'CPL (Custo por Lead)',
    icon: <Users className="h-4 w-4" />,
    suffix: 'R$',
    description: 'Custo máximo aceitável por lead',
  },
  {
    key: 'default_target_ctr',
    label: 'CTR (Taxa de Cliques)',
    icon: <MousePointerClick className="h-4 w-4" />,
    suffix: '%',
    description: 'Taxa mínima de cliques esperada',
    step: '0.1',
  },
  {
    key: 'default_target_cpc',
    label: 'CPC (Custo por Clique)',
    icon: <Target className="h-4 w-4" />,
    suffix: 'R$',
    description: 'Custo máximo aceitável por clique',
    step: '0.01',
  },
  {
    key: 'default_target_cpm',
    label: 'CPM (Custo por Mil)',
    icon: <Eye className="h-4 w-4" />,
    suffix: 'R$',
    description: 'Custo máximo por mil impressões',
  },
  {
    key: 'default_target_roas',
    label: 'ROAS (Retorno sobre Gasto)',
    icon: <TrendingUp className="h-4 w-4" />,
    suffix: 'x',
    description: 'Retorno mínimo esperado sobre investimento',
    step: '0.1',
  },
  {
    key: 'default_target_frequency',
    label: 'Frequência',
    icon: <RefreshCw className="h-4 w-4" />,
    suffix: 'x',
    description: 'Frequência máxima de exibição por usuário',
    step: '0.1',
  },
  {
    key: 'default_target_conversion_rate',
    label: 'Taxa de Conversão',
    icon: <Percent className="h-4 w-4" />,
    suffix: '%',
    description: 'Taxa mínima de conversão esperada',
    step: '0.1',
  },
];

export const DefaultBenchmarksSettings = () => {
  const { benchmarks, isLoading, saveBenchmarks, restoreDefaults, isSaving } = useDefaultBenchmarks();
  const [formData, setFormData] = useState<DefaultBenchmarks>(SYSTEM_DEFAULTS);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (benchmarks) {
      setFormData(benchmarks);
    }
  }, [benchmarks]);

  const handleChange = (key: keyof DefaultBenchmarks, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setFormData(prev => ({ ...prev, [key]: numValue }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await saveBenchmarks(formData);
    setHasChanges(false);
  };

  const handleRestore = async () => {
    await restoreDefaults();
    setFormData(SYSTEM_DEFAULTS);
    setRestoreDialogOpen(false);
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Carregando configurações...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Métricas Padrão do Sistema
          </CardTitle>
          <CardDescription>
            Configure os valores padrão para indicadores de performance. Esses valores são usados quando o cliente não possui métricas ideais configuradas individualmente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Como funciona:</strong> Quando um cliente não tem métricas específicas definidas, 
              o sistema utiliza esses valores padrão para gerar alertas nos dashboards (TV Dashboard e Radar). 
              Você pode personalizar esses valores de acordo com as metas médias da sua agência.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {metricFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key} className="flex items-center gap-2">
                  {field.icon}
                  {field.label}
                </Label>
                <div className="flex items-center gap-2">
                  {field.suffix === 'R$' && (
                    <span className="text-muted-foreground text-sm">R$</span>
                  )}
                  <Input
                    id={field.key}
                    type="number"
                    step={field.step || '1'}
                    min="0"
                    value={formData[field.key] ?? ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={String(SYSTEM_DEFAULTS[field.key])}
                    className="flex-1"
                  />
                  {field.suffix !== 'R$' && (
                    <span className="text-muted-foreground text-sm w-6">{field.suffix}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{field.description}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setRestoreDialogOpen(true)}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar Padrões do Sistema
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar Padrões do Sistema</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá restaurar todos os valores para os padrões originais do sistema:
              <ul className="mt-2 ml-4 list-disc text-sm">
                <li>CPA: R$ 100</li>
                <li>CPL: R$ 50</li>
                <li>CTR: 1%</li>
                <li>CPC: R$ 3</li>
                <li>CPM: R$ 30</li>
                <li>ROAS: 3x</li>
                <li>Frequência: 3x</li>
                <li>Taxa de Conversão: 2%</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
