import { useState } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, ChevronDown, Image, Film, Images } from 'lucide-react';
import { AdSetData, CreativeData } from "@/hooks/useCampaignBuilder";
import { AudienceMultiSelect } from "./AudienceMultiSelect";
import { CreativeEditor } from "./CreativeEditor";
import { cn } from "@/lib/utils";

interface AdSetSectionProps {
  adSet: AdSetData;
  clientId: string;
  onChange: (updates: Partial<AdSetData>) => void;
  onAddCreative: () => void;
  onRemoveCreative: (index: number) => void;
  onUpdateCreative: (index: number, updates: Partial<CreativeData>) => void;
}

export function AdSetSection({
  adSet,
  clientId,
  onChange,
  onAddCreative,
  onRemoveCreative,
  onUpdateCreative,
}: AdSetSectionProps) {
  const [expandedCreative, setExpandedCreative] = useState<number | null>(0);

  const getCreativeIcon = (type: CreativeData['type']) => {
    switch (type) {
      case 'VIDEO': return <Film className="h-4 w-4" />;
      case 'CAROUSEL': return <Images className="h-4 w-4" />;
      default: return <Image className="h-4 w-4" />;
    }
  };

  const getCreativeLabel = (creative: CreativeData, index: number) => {
    if (creative.title) return creative.title;
    const typeLabels = { IMAGE: 'Imagem', VIDEO: 'Vídeo', CAROUSEL: 'Carrossel' };
    return `${typeLabels[creative.type]} ${index + 1}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Conjunto de Anúncios</h2>
        <p className="text-sm text-muted-foreground">
          Configure a segmentação e os criativos deste conjunto
        </p>
      </div>

      {/* Basic Info */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="adset-name">Nome do Conjunto *</Label>
          <Input
            id="adset-name"
            placeholder="Ex: Público Lookalike 1%"
            value={adSet.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>
      </div>

      {/* Targeting */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Segmentação por Público</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      {/* Demographics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Demografia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Faixa Etária</Label>
              <span className="text-sm text-muted-foreground">
                {adSet.ageMin} - {adSet.ageMax === 65 ? '65+' : adSet.ageMax} anos
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min={18}
                max={64}
                value={adSet.ageMin}
                onChange={(e) => onChange({ ageMin: parseInt(e.target.value) || 18 })}
                className="w-20"
              />
              <Slider
                value={[adSet.ageMin, adSet.ageMax]}
                min={18}
                max={65}
                step={1}
                onValueChange={([min, max]) => onChange({ ageMin: min, ageMax: max })}
                className="flex-1"
              />
              <Input
                type="number"
                min={19}
                max={65}
                value={adSet.ageMax}
                onChange={(e) => onChange({ ageMax: parseInt(e.target.value) || 65 })}
                className="w-20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Gênero</Label>
            <Select
              value={adSet.genders[0]?.toString() || '0'}
              onValueChange={(value) => onChange({ genders: [parseInt(value)] })}
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
        </CardContent>
      </Card>

      {/* Creatives */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">🎨 Criativos</h3>
            <p className="text-sm text-muted-foreground">
              {adSet.creatives.length} criativo(s) neste conjunto
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onAddCreative}>
            <Plus className="h-4 w-4 mr-1" />
            Novo Criativo
          </Button>
        </div>

        <div className="space-y-2">
          {adSet.creatives.map((creative, index) => (
            <Collapsible
              key={creative.id}
              open={expandedCreative === index}
              onOpenChange={(open) => setExpandedCreative(open ? index : null)}
            >
              <Card className={cn(
                'transition-colors',
                expandedCreative === index && 'ring-2 ring-primary'
              )}>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getCreativeIcon(creative.type)}
                        <span className="font-medium text-sm">
                          {getCreativeLabel(creative, index)}
                        </span>
                        {creative.mediaUrls.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({creative.mediaUrls.length} mídia{creative.mediaUrls.length > 1 ? 's' : ''})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {adSet.creatives.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveCreative(index);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        <ChevronDown className={cn(
                          'h-4 w-4 transition-transform',
                          expandedCreative === index && 'rotate-180'
                        )} />
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 border-t">
                    <CreativeEditor
                      creative={creative}
                      onChange={(updates) => onUpdateCreative(index, updates)}
                    />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      </div>
    </div>
  );
}
