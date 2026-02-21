import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Layers,
  Settings,
  Users,
  Target,
} from 'lucide-react';
import { AdSetData, CreativeData } from "@/hooks/useCampaignBuilder";
import { AudienceMultiSelect } from "./AudienceMultiSelect";
import { PixelSelector } from "./PixelSelector";
import { ConversionEventSelector } from "./ConversionEventSelector";

interface AdSetSectionProps {
  adSet: AdSetData;
  clientId: string;
  companyId: string;
  campaignObjective: string;
  clientName?: string;
  clientAvatar?: string;
  onChange: (updates: Partial<AdSetData>) => void;
  onAddCreative: () => void;
  onRemoveCreative: (index: number) => void;
  onUpdateCreative: (index: number, updates: Partial<CreativeData>) => void;
}

export function AdSetSection({
  adSet,
  clientId,
  companyId,
  campaignObjective,
  onChange,
}: AdSetSectionProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header - matches AdSetEditContent */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-primary" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold">Conjunto de Anúncios</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">META</Badge>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                Novo
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Two Column Layout - matches AdSetEditContent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column - Basic Settings & Demographics */}
            <div className="space-y-6">
              {/* Basic Settings Section */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                  <Settings className="w-4 h-4" />
                  Configurações Básicas
                </h4>

                {/* Name Field */}
                <div className="space-y-2">
                  <Label>Nome do Conjunto *</Label>
                  <Input
                    value={adSet.name}
                    onChange={(e) => onChange({ name: e.target.value })}
                    placeholder="Ex: Público Lookalike - 18-35"
                  />
                  {adSet.name.trim() === '' && (
                    <p className="text-xs text-destructive">O nome não pode estar vazio</p>
                  )}
                </div>
              </div>

              {/* Demographics Section */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                  <Users className="w-4 h-4" />
                  Demografia
                </h4>

                {/* Age Range */}
                <div className="space-y-3">
                  <Label>Faixa Etária: {adSet.ageMin} - {adSet.ageMax} anos</Label>
                  <div className="px-2">
                    <Slider
                      min={18}
                      max={65}
                      step={1}
                      value={[adSet.ageMin, adSet.ageMax]}
                      onValueChange={([min, max]) => {
                        onChange({ ageMin: min, ageMax: max });
                      }}
                    />
                  </div>
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <Label>Gênero</Label>
                  <Select
                    value={adSet.genders[0]?.toString() || '0'}
                    onValueChange={(v) => {
                      onChange({ genders: [parseInt(v)] });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Todos</SelectItem>
                      <SelectItem value="1">Masculino</SelectItem>
                      <SelectItem value="2">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Conversion Section */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                  <Target className="w-4 h-4" />
                  Conversão (opcional)
                </h4>

                <PixelSelector
                  clientId={clientId}
                  companyId={companyId}
                  value={adSet.pixelId}
                  onChange={(pixelId) => {
                    onChange({ pixelId: pixelId || undefined });
                    if (!pixelId) {
                      onChange({ pixelId: undefined, conversionEvent: undefined });
                    }
                  }}
                />

                <ConversionEventSelector
                  value={adSet.conversionEvent}
                  onChange={(conversionEvent) => onChange({ conversionEvent: conversionEvent || undefined })}
                  disabled={!adSet.pixelId}
                  campaignObjective={campaignObjective}
                />
              </div>
            </div>

            {/* Right Column - Audiences */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                  <Users className="w-4 h-4" />
                  Públicos
                </h4>

                <AudienceMultiSelect
                  clientId={clientId}
                  selectedIds={adSet.includedAudiences}
                  onChange={(ids) => onChange({ includedAudiences: ids })}
                  label="📎 Públicos de Inclusão"
                  placeholder="Selecione públicos para incluir..."
                />

                <AudienceMultiSelect
                  clientId={clientId}
                  selectedIds={adSet.excludedAudiences}
                  onChange={(ids) => onChange({ excludedAudiences: ids })}
                  label="🚫 Públicos de Exclusão"
                  placeholder="Selecione públicos para excluir..."
                />
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
