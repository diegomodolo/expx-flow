import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Layers, Plus, Copy, Trash2, Users, X } from "lucide-react";
import { EditableAdSet, EditableCreative, EditableStrategy } from "./types";
import { EditableCreativeCard } from "./EditableCreativeCard";
import { useMetaAudiences } from "@/hooks/useMetaAudiences";

interface EditableAdSetsSectionProps {
  strategy: EditableStrategy;
  onChange: (updates: Partial<EditableStrategy>) => void;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
}

const createDefaultCreative = (): EditableCreative => ({
  id: crypto.randomUUID(),
  type: 'IMAGE',
  headline: '',
  body: '',
  description: '',
  linkUrl: '',
  callToAction: 'LEARN_MORE',
  mediaUrls: [],
  urlParameters: {},
});

export function EditableAdSetsSection({
  strategy,
  onChange,
  clientId,
  clientName,
  clientAvatar,
}: EditableAdSetsSectionProps) {
  const { audiences } = useMetaAudiences(clientId);
  const [expandedAdSets, setExpandedAdSets] = useState<string[]>(
    strategy.adSets.map(as => as.id)
  );

  const handleAdSetChange = (adSetId: string, updates: Partial<EditableAdSet>) => {
    onChange({
      adSets: strategy.adSets.map(as =>
        as.id === adSetId ? { ...as, ...updates } : as
      ),
    });
  };

  const handleAddAdSet = () => {
    const newAdSet: EditableAdSet = {
      id: crypto.randomUUID(),
      name: `Conjunto ${strategy.adSets.length + 1}`,
      includedAudiences: [],
      excludedAudiences: [],
      creatives: [createDefaultCreative()],
    };
    onChange({ adSets: [...strategy.adSets, newAdSet] });
    setExpandedAdSets([...expandedAdSets, newAdSet.id]);
  };

  const handleDuplicateAdSet = (adSetId: string) => {
    const adSetToDuplicate = strategy.adSets.find(as => as.id === adSetId);
    if (!adSetToDuplicate) return;

    const newAdSet: EditableAdSet = {
      ...adSetToDuplicate,
      id: crypto.randomUUID(),
      name: `${adSetToDuplicate.name} (cópia)`,
      creatives: adSetToDuplicate.creatives.map(c => ({
        ...c,
        id: crypto.randomUUID(),
      })),
    };
    onChange({ adSets: [...strategy.adSets, newAdSet] });
    setExpandedAdSets([...expandedAdSets, newAdSet.id]);
  };

  const handleRemoveAdSet = (adSetId: string) => {
    if (strategy.adSets.length <= 1) return;
    onChange({ adSets: strategy.adSets.filter(as => as.id !== adSetId) });
    setExpandedAdSets(expandedAdSets.filter(id => id !== adSetId));
  };

  const handleCreativeChange = (adSetId: string, creativeId: string, creative: EditableCreative) => {
    onChange({
      adSets: strategy.adSets.map(as =>
        as.id === adSetId
          ? {
              ...as,
              creatives: as.creatives.map(c =>
                c.id === creativeId ? creative : c
              ),
            }
          : as
      ),
    });
  };

  const handleAddCreative = (adSetId: string) => {
    onChange({
      adSets: strategy.adSets.map(as =>
        as.id === adSetId
          ? { ...as, creatives: [...as.creatives, createDefaultCreative()] }
          : as
      ),
    });
  };

  const handleDuplicateCreative = (adSetId: string, creativeId: string) => {
    const adSet = strategy.adSets.find(as => as.id === adSetId);
    const creative = adSet?.creatives.find(c => c.id === creativeId);
    if (!creative) return;

    onChange({
      adSets: strategy.adSets.map(as =>
        as.id === adSetId
          ? { ...as, creatives: [...as.creatives, { ...creative, id: crypto.randomUUID() }] }
          : as
      ),
    });
  };

  const handleRemoveCreative = (adSetId: string, creativeId: string) => {
    const adSet = strategy.adSets.find(as => as.id === adSetId);
    if (!adSet || adSet.creatives.length <= 1) return;

    onChange({
      adSets: strategy.adSets.map(as =>
        as.id === adSetId
          ? { ...as, creatives: as.creatives.filter(c => c.id !== creativeId) }
          : as
      ),
    });
  };

  const getAudienceName = (id: string): string => {
    const audience = audiences.find(a => a.id === id);
    return audience?.name || id;
  };

  const availableAudiences = (adSet: EditableAdSet) =>
    audiences.filter(
      a => !adSet.includedAudiences.includes(a.id) && !adSet.excludedAudiences.includes(a.id)
    );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Conjuntos de Anúncios ({strategy.adSets.length})
          </div>
          <Button size="sm" variant="outline" onClick={handleAddAdSet}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Conjunto
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion
          type="multiple"
          value={expandedAdSets}
          onValueChange={setExpandedAdSets}
          className="space-y-4"
        >
          {strategy.adSets.map((adSet, adSetIndex) => (
            <AccordionItem
              key={adSet.id}
              value={adSet.id}
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center justify-between flex-1 mr-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">
                      {adSetIndex + 1}
                    </Badge>
                    <span className="font-medium">{adSet.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {adSet.creatives.length} criativo(s)
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDuplicateAdSet(adSet.id)}
                      title="Duplicar conjunto"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    {strategy.adSets.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAdSet(adSet.id)}
                        className="text-destructive hover:text-destructive"
                        title="Remover conjunto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                {/* Ad Set Name */}
                <div className="space-y-2">
                  <Label>Nome do Conjunto</Label>
                  <Input
                    value={adSet.name}
                    onChange={(e) => handleAdSetChange(adSet.id, { name: e.target.value })}
                    placeholder="Nome do conjunto de anúncios"
                  />
                </div>

                {/* Ad Set Audiences (override) */}
                <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                  <Label className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4" />
                    Públicos Específicos (opcional)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Sobrescreve os públicos da campanha apenas para este conjunto
                  </p>

                  {/* Included */}
                  <div className="space-y-2">
                    <Label className="text-xs">Incluir</Label>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {adSet.includedAudiences.map((id) => (
                        <Badge key={id} variant="default" className="text-xs pr-1">
                          {getAudienceName(id)}
                          <button
                            onClick={() => handleAdSetChange(adSet.id, {
                              includedAudiences: adSet.includedAudiences.filter(aid => aid !== id),
                            })}
                            className="ml-1 p-0.5 rounded-full hover:bg-primary-foreground/20"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <Select
                      value=""
                      onValueChange={(value) => handleAdSetChange(adSet.id, {
                        includedAudiences: [...adSet.includedAudiences, value],
                      })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Adicionar público..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAudiences(adSet).map((audience) => (
                          <SelectItem key={audience.id} value={audience.id}>
                            {audience.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Excluded */}
                  <div className="space-y-2">
                    <Label className="text-xs">Excluir</Label>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {adSet.excludedAudiences.map((id) => (
                        <Badge key={id} variant="destructive" className="text-xs pr-1">
                          {getAudienceName(id)}
                          <button
                            onClick={() => handleAdSetChange(adSet.id, {
                              excludedAudiences: adSet.excludedAudiences.filter(aid => aid !== id),
                            })}
                            className="ml-1 p-0.5 rounded-full hover:bg-destructive-foreground/20"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <Select
                      value=""
                      onValueChange={(value) => handleAdSetChange(adSet.id, {
                        excludedAudiences: [...adSet.excludedAudiences, value],
                      })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Adicionar exclusão..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAudiences(adSet).map((audience) => (
                          <SelectItem key={audience.id} value={audience.id}>
                            {audience.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Creatives */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Criativos</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAddCreative(adSet.id)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar Criativo
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {adSet.creatives.map((creative, creativeIndex) => (
                      <EditableCreativeCard
                        key={creative.id}
                        creative={creative}
                        index={creativeIndex}
                        clientId={clientId}
                        clientName={clientName}
                        clientAvatar={clientAvatar}
                        onChange={(c) => handleCreativeChange(adSet.id, creative.id, c)}
                        onDuplicate={() => handleDuplicateCreative(adSet.id, creative.id)}
                        onRemove={() => handleRemoveCreative(adSet.id, creative.id)}
                        canRemove={adSet.creatives.length > 1}
                      />
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
