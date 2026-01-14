import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, DollarSign, Percent, Eye, RefreshCw } from "lucide-react";
import { BenchmarkFormData, emptyBenchmarkFormData } from "@/hooks/useClientBenchmarks";
import { cn } from "@/lib/utils";

interface MetricInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

function MetricInput({ label, value, onChange, placeholder, prefix, suffix, disabled, icon }: MetricInputProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </Label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {prefix}
          </span>
        )}
        <Input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "h-9",
            prefix && "pl-8",
            suffix && "pr-8"
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

interface PlatformBenchmarkCardProps {
  platform: 'meta_ads' | 'google_ads';
  formData: BenchmarkFormData;
  onChange: (data: BenchmarkFormData) => void;
  disabled?: boolean;
}

function PlatformBenchmarkCard({ platform, formData, onChange, disabled }: PlatformBenchmarkCardProps) {
  const platformInfo = platform === 'meta_ads' 
    ? { 
        name: 'Meta Ads', 
        color: 'from-blue-500 to-indigo-600',
        bgColor: 'bg-blue-50 dark:bg-blue-950/30',
        borderColor: 'border-blue-200 dark:border-blue-800'
      }
    : { 
        name: 'Google Ads', 
        color: 'from-red-500 to-yellow-500',
        bgColor: 'bg-red-50 dark:bg-red-950/30',
        borderColor: 'border-red-200 dark:border-red-800'
      };

  const updateField = (field: keyof BenchmarkFormData, value: string | boolean) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <Card className={cn(
      "transition-all duration-200",
      formData.is_active 
        ? `${platformInfo.bgColor} ${platformInfo.borderColor}` 
        : "bg-muted/30 opacity-60"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-2 h-8 rounded-full bg-gradient-to-b",
              platformInfo.color
            )} />
            <div>
              <CardTitle className="text-base">{platformInfo.name}</CardTitle>
              <CardDescription className="text-xs">
                Métricas ideais para campanhas
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor={`${platform}-active`} className="text-xs text-muted-foreground">
              Ativo
            </Label>
            <Switch
              id={`${platform}-active`}
              checked={formData.is_active}
              onCheckedChange={(checked) => updateField('is_active', checked)}
              disabled={disabled}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Row 1: CPA, CPL, CTR */}
        <div className="grid grid-cols-3 gap-3">
          <MetricInput
            label="CPA Ideal"
            value={formData.target_cpa}
            onChange={(v) => updateField('target_cpa', v)}
            placeholder="0.00"
            prefix="R$"
            disabled={disabled || !formData.is_active}
            icon={<DollarSign className="w-3 h-3" />}
          />
          <MetricInput
            label="CPL Ideal"
            value={formData.target_cpl}
            onChange={(v) => updateField('target_cpl', v)}
            placeholder="0.00"
            prefix="R$"
            disabled={disabled || !formData.is_active}
            icon={<DollarSign className="w-3 h-3" />}
          />
          <MetricInput
            label="CTR Ideal"
            value={formData.target_ctr}
            onChange={(v) => updateField('target_ctr', v)}
            placeholder="0.00"
            suffix="%"
            disabled={disabled || !formData.is_active}
            icon={<Percent className="w-3 h-3" />}
          />
        </div>

        {/* Row 2: CPC, CPM, ROAS */}
        <div className="grid grid-cols-3 gap-3">
          <MetricInput
            label="CPC Ideal"
            value={formData.target_cpc}
            onChange={(v) => updateField('target_cpc', v)}
            placeholder="0.00"
            prefix="R$"
            disabled={disabled || !formData.is_active}
            icon={<DollarSign className="w-3 h-3" />}
          />
          <MetricInput
            label="CPM Ideal"
            value={formData.target_cpm}
            onChange={(v) => updateField('target_cpm', v)}
            placeholder="0.00"
            prefix="R$"
            disabled={disabled || !formData.is_active}
            icon={<Eye className="w-3 h-3" />}
          />
          <MetricInput
            label="ROAS Ideal"
            value={formData.target_roas}
            onChange={(v) => updateField('target_roas', v)}
            placeholder="0.00"
            suffix="x"
            disabled={disabled || !formData.is_active}
            icon={<TrendingUp className="w-3 h-3" />}
          />
        </div>

        {/* Row 3: Conversion Rate, Frequency */}
        <div className="grid grid-cols-2 gap-3">
          <MetricInput
            label="Taxa de Conversão"
            value={formData.target_conversion_rate}
            onChange={(v) => updateField('target_conversion_rate', v)}
            placeholder="0.00"
            suffix="%"
            disabled={disabled || !formData.is_active}
            icon={<Percent className="w-3 h-3" />}
          />
          <MetricInput
            label="Frequência Máxima"
            value={formData.target_frequency}
            onChange={(v) => updateField('target_frequency', v)}
            placeholder="0.0"
            disabled={disabled || !formData.is_active}
            icon={<RefreshCw className="w-3 h-3" />}
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface ClientMetricBenchmarksSectionProps {
  metaFormData: BenchmarkFormData;
  googleFormData: BenchmarkFormData;
  onMetaChange: (data: BenchmarkFormData) => void;
  onGoogleChange: (data: BenchmarkFormData) => void;
  readOnly?: boolean;
}

export function ClientMetricBenchmarksSection({
  metaFormData,
  googleFormData,
  onMetaChange,
  onGoogleChange,
  readOnly = false
}: ClientMetricBenchmarksSectionProps) {
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-muted/50 rounded-lg p-4 border">
        <div className="flex items-start gap-3">
          <Target className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium">Métricas Ideais (Benchmarks)</p>
            <p className="text-sm text-muted-foreground mt-1">
              Configure os valores ideais de performance para este cliente. Essas métricas serão usadas 
              como referência para avaliar se os resultados estão bons ou precisam de atenção.
            </p>
          </div>
        </div>
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PlatformBenchmarkCard
          platform="meta_ads"
          formData={metaFormData}
          onChange={onMetaChange}
          disabled={readOnly}
        />
        <PlatformBenchmarkCard
          platform="google_ads"
          formData={googleFormData}
          onChange={onGoogleChange}
          disabled={readOnly}
        />
      </div>

      {/* Info Footer */}
      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          💡 <strong>Dica:</strong> Deixe os campos em branco para métricas que não são relevantes 
          para este cliente. Apenas métricas preenchidas serão consideradas na avaliação.
        </p>
      </div>
    </div>
  );
}
