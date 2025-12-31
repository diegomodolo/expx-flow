import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Layers, Plus, Copy, Trash2, Users, X, Target, Database, Loader2 } from "lucide-react";
import { EditableAdSet, EditableCreative, EditableStrategy, createDefaultCreative, createDefaultAdSet } from "./types";
import { EditableCreativeCard } from "./EditableCreativeCard";
import { useMetaAudiences } from "@/hooks/useMetaAudiences";
import { useLeadSegmentsForAudience } from "@/hooks/useLeadSegmentsForAudience";
import { useToast } from "@/hooks/use-toast";

interface EditableAdSetsSectionProps {
  strategy: EditableStrategy;
  onChange: (updates: Partial<EditableStrategy>) => void;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
}

export function EditableAdSetsSection({
  strategy,
  onChange,
  clientId,
  clientName,
  clientAvatar,
}: EditableAdSetsSectionProps) {
  const { toast } = useToast();
  const { audiences, fetchAudiences, createAudience, loading: audiencesLoading } = useMetaAudiences(clientId);
  const { segments, fetchSegments, createAudienceFromSegment, loading: segmentsLoading } = useLeadSegmentsForAudience(clientId);
  
  const [expandedAdSets, setExpandedAdSets] = useState<string[]>(
    strategy.adSets.map(as => as.id)
  );
  const [creatingAudienceFor, setCreatingAudienceFor] = useState<string | null>(null);
  const [selectedSegments, setSelectedSegments] = useState<Record<string, string>>({});

  // Load audiences and segments on mount
  useEffect(() => {
    if (clientId) {
      fetchAudiences();
      fetchSegments();
    }
  }, [clientId, fetchAudiences, fetchSegments]);

  const handleAdSetChange = (adSetId: string, updates: Partial<EditableAdSet>) => {
    onChange({
      adSets: strategy.adSets.map(as =>
        as.id === adSetId ? { ...as, ...updates } : as
      ),
    });
  };

  const handleAddAdSet = () => {
    const newAdSet = createDefaultAdSet(`Conjunto ${strategy.adSets.length + 1}`, strategy.adSets.length);
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

  // Interests and behaviors management
  const handleAddInterest = (adSetId: string, interest: string) => {
    if (!interest.trim()) return;
    const adSet = strategy.adSets.find(as => as.id === adSetId);
    if (!adSet || adSet.interests.includes(interest.trim())) return;
    
    handleAdSetChange(adSetId, {
      interests: [...adSet.interests, interest.trim()]
    });
  };

  const handleRemoveInterest = (adSetId: string, interest: string) => {
    const adSet = strategy.adSets.find(as => as.id === adSetId);
    if (!adSet) return;
    
    handleAdSetChange(adSetId, {
      interests: adSet.interests.filter(i => i !== interest)
    });
  };

  const handleAddBehavior = (adSetId: string, behavior: string) => {
    if (!behavior.trim()) return;
    const adSet = strategy.adSets.find(as => as.id === adSetId);
    if (!adSet || adSet.behaviors.includes(behavior.trim())) return;
    
    handleAdSetChange(adSetId, {
      behaviors: [...adSet.behaviors, behavior.trim()]
    });
  };

  const handleRemoveBehavior = (adSetId: string, behavior: string) => {
    const adSet = strategy.adSets.find(as => as.id === adSetId);
    if (!adSet) return;
    
    handleAdSetChange(adSetId, {
      behaviors: adSet.behaviors.filter(b => b !== behavior)
    });
  };

  const handleGenderChange = (adSetId: string, values: string[]) => {
    if (values.length === 0) return;
    handleAdSetChange(adSetId, {
      genders: values as ('all' | 'male' | 'female')[]
    });
  };

  // Create audience from Lead Intelligence segment
  const handleCreateFromSegment = async (adSetId: string) => {
    const segmentId = selectedSegments[adSetId];
    if (!segmentId) {
      toast({
        title: "Selecione um segmento",
        description: "Escolha um segmento do Lead Intelligence para criar o público.",
        variant: "destructive",
      });
      return;
    }

    setCreatingAudienceFor(adSetId);
    try {
      const result = await createAudienceFromSegment(segmentId);
      if (result) {
        // Refresh audiences and add to this ad set
        await fetchAudiences();
        const adSet = strategy.adSets.find(as => as.id === adSetId);
        if (adSet) {
          handleAdSetChange(adSetId, {
            includedAudiences: [...adSet.includedAudiences, result.id]
          });
        }
        toast({
          title: "Público criado!",
          description: `O público "${result.name}" foi criado e adicionado ao conjunto.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao criar público",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreatingAudienceFor(null);
      setSelectedSegments(prev => ({ ...prev, [adSetId]: '' }));
    }
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

                {/* Targeting Section */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Target className="w-4 h-4" />
                    Segmentação
                  </Label>

                  {/* Age Range */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Faixa Etária</Label>
                      <span className="text-xs font-medium">{adSet.ageMin} - {adSet.ageMax} anos</span>
                    </div>
                    <Slider
                      value={[adSet.ageMin, adSet.ageMax]}
                      onValueChange={([min, max]) => handleAdSetChange(adSet.id, { ageMin: min, ageMax: max })}
                      min={18}
                      max={65}
                      step={1}
                      minStepsBetweenThumbs={5}
                    />
                  </div>

                  {/* Genders */}
                  <div className="space-y-2">
                    <Label className="text-xs">Gênero</Label>
                    <ToggleGroup
                      type="multiple"
                      value={adSet.genders}
                      onValueChange={(v) => handleGenderChange(adSet.id, v)}
                      className="justify-start"
                    >
                      <ToggleGroupItem value="all" className="text-xs">Todos</ToggleGroupItem>
                      <ToggleGroupItem value="male" className="text-xs">Masculino</ToggleGroupItem>
                      <ToggleGroupItem value="female" className="text-xs">Feminino</ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  {/* Interests */}
                  <div className="space-y-2">
                    <Label className="text-xs">Interesses</Label>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {adSet.interests.map((interest, i) => (
                        <Badge key={i} variant="secondary" className="text-xs pr-1">
                          {interest}
                          <button
                            onClick={() => handleRemoveInterest(adSet.id, interest)}
                            className="ml-1 p-0.5 rounded-full hover:bg-secondary-foreground/20"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Adicionar interesse..."
                        className="h-8 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddInterest(adSet.id, (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Behaviors */}
                  <div className="space-y-2">
                    <Label className="text-xs">Comportamentos</Label>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {adSet.behaviors.map((behavior, i) => (
                        <Badge key={i} variant="outline" className="text-xs pr-1">
                          {behavior}
                          <button
                            onClick={() => handleRemoveBehavior(adSet.id, behavior)}
                            className="ml-1 p-0.5 rounded-full hover:bg-muted"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Adicionar comportamento..."
                        className="h-8 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddBehavior(adSet.id, (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Custom Audiences Section */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Users className="w-4 h-4" />
                    Públicos Personalizados
                  </Label>

                  {/* Lead Intelligence */}
                  <div className="space-y-2 p-3 border border-dashed rounded-lg">
                    <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Database className="w-3 h-3" />
                      Criar do Lead Intelligence
                    </Label>
                    <div className="flex gap-2">
                      <Select
                        value={selectedSegments[adSet.id] || ''}
                        onValueChange={(v) => setSelectedSegments(prev => ({ ...prev, [adSet.id]: v }))}
                        disabled={segmentsLoading}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue placeholder={segmentsLoading ? "Carregando..." : "Selecionar segmento..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {segments.map((segment) => (
                            <SelectItem key={segment.id} value={segment.id} className="text-xs">
                              {segment.name} ({segment.leadCount} leads)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreateFromSegment(adSet.id)}
                        disabled={!selectedSegments[adSet.id] || creatingAudienceFor === adSet.id}
                        className="h-8 text-xs"
                      >
                        {creatingAudienceFor === adSet.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Plus className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Included Audiences */}
                  <div className="space-y-2">
                    <Label className="text-xs">Incluir Públicos</Label>
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
                      disabled={audiencesLoading}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={audiencesLoading ? "Carregando..." : "Adicionar público..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAudiences(adSet).map((audience) => (
                          <SelectItem key={audience.id} value={audience.id} className="text-xs">
                            {audience.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Excluded Audiences */}
                  <div className="space-y-2">
                    <Label className="text-xs">Excluir Públicos</Label>
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
                      disabled={audiencesLoading}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Adicionar exclusão..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAudiences(adSet).map((audience) => (
                          <SelectItem key={audience.id} value={audience.id} className="text-xs">
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
