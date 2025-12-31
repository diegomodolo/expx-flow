import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Users, Database, Plus, X, Loader2, RefreshCw } from "lucide-react";
import { useMetaAudiences, MetaAudience } from "@/hooks/useMetaAudiences";
import { useLeadSegmentsForAudience } from "@/hooks/useLeadSegmentsForAudience";
import { EditableStrategy } from "./types";

interface AudienceIntegrationSectionProps {
  strategy: EditableStrategy;
  onChange: (updates: Partial<EditableStrategy>) => void;
  clientId: string;
}

export function AudienceIntegrationSection({ 
  strategy, 
  onChange, 
  clientId 
}: AudienceIntegrationSectionProps) {
  const { 
    audiences, 
    loading: audiencesLoading, 
    fetchAudiences,
    error: audiencesError
  } = useMetaAudiences(clientId);

  const {
    segments,
    loading: segmentsLoading,
    createAudienceFromSegment,
  } = useLeadSegmentsForAudience(clientId);

  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("");
  const [creatingAudience, setCreatingAudience] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchAudiences();
    }
  }, [clientId, fetchAudiences]);

  const handleAddIncludedAudience = (audienceId: string) => {
    if (!strategy.includedAudiences.includes(audienceId)) {
      onChange({ includedAudiences: [...strategy.includedAudiences, audienceId] });
    }
  };

  const handleRemoveIncludedAudience = (audienceId: string) => {
    onChange({ includedAudiences: strategy.includedAudiences.filter(id => id !== audienceId) });
  };

  const handleAddExcludedAudience = (audienceId: string) => {
    if (!strategy.excludedAudiences.includes(audienceId)) {
      onChange({ excludedAudiences: [...strategy.excludedAudiences, audienceId] });
    }
  };

  const handleRemoveExcludedAudience = (audienceId: string) => {
    onChange({ excludedAudiences: strategy.excludedAudiences.filter(id => id !== audienceId) });
  };

  const handleCreateFromSegment = async () => {
    if (!selectedSegmentId) return;
    
    setCreatingAudience(true);
    try {
      const newAudience = await createAudienceFromSegment(selectedSegmentId);
      if (newAudience) {
        handleAddIncludedAudience(newAudience.id);
        await fetchAudiences();
      }
    } finally {
      setCreatingAudience(false);
      setSelectedSegmentId("");
    }
  };

  const getAudienceName = (id: string): string => {
    const audience = audiences.find(a => a.id === id);
    return audience?.name || id;
  };

  const availableForInclusion = audiences.filter(
    a => !strategy.includedAudiences.includes(a.id) && !strategy.excludedAudiences.includes(a.id)
  );

  const availableForExclusion = audiences.filter(
    a => !strategy.excludedAudiences.includes(a.id) && !strategy.includedAudiences.includes(a.id)
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Públicos Personalizados
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchAudiences(true)}
            disabled={audiencesLoading}
          >
            <RefreshCw className={`w-4 h-4 ${audiencesLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={["lead-intelligence", "meta-audiences"]} className="w-full">
          {/* Lead Intelligence Segments */}
          <AccordionItem value="lead-intelligence">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-muted-foreground" />
                <span>Lead Intelligence</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground">
                Crie um público personalizado a partir de um segmento de leads
              </p>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedSegmentId}
                  onValueChange={setSelectedSegmentId}
                  disabled={segmentsLoading}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione um segmento..." />
                  </SelectTrigger>
                  <SelectContent>
                    {segments.map((segment) => (
                      <SelectItem key={segment.id} value={segment.id}>
                        {segment.name} ({segment.leadCount} leads)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleCreateFromSegment}
                  disabled={!selectedSegmentId || creatingAudience}
                >
                  {creatingAudience ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Meta Audiences */}
          <AccordionItem value="meta-audiences">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>Públicos do Meta ({audiences.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {audiencesError && (
                <p className="text-xs text-destructive">{audiencesError}</p>
              )}

              {/* Inclusion */}
              <div className="space-y-2">
                <Label className="text-xs">Incluir públicos</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {strategy.includedAudiences.map((id) => (
                    <Badge 
                      key={id} 
                      variant="default"
                      className="flex items-center gap-1 pr-1"
                    >
                      {getAudienceName(id)}
                      <button
                        onClick={() => handleRemoveIncludedAudience(id)}
                        className="ml-1 p-0.5 rounded-full hover:bg-primary-foreground/20"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Select
                  value=""
                  onValueChange={handleAddIncludedAudience}
                  disabled={audiencesLoading || availableForInclusion.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Adicionar público de inclusão..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableForInclusion.map((audience) => (
                      <SelectItem key={audience.id} value={audience.id}>
                        {audience.name} ({audience.approximate_count?.toLocaleString() || '?'} pessoas)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Exclusion */}
              <div className="space-y-2">
                <Label className="text-xs">Excluir públicos</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {strategy.excludedAudiences.map((id) => (
                    <Badge 
                      key={id} 
                      variant="destructive"
                      className="flex items-center gap-1 pr-1"
                    >
                      {getAudienceName(id)}
                      <button
                        onClick={() => handleRemoveExcludedAudience(id)}
                        className="ml-1 p-0.5 rounded-full hover:bg-destructive-foreground/20"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Select
                  value=""
                  onValueChange={handleAddExcludedAudience}
                  disabled={audiencesLoading || availableForExclusion.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Adicionar público de exclusão..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableForExclusion.map((audience) => (
                      <SelectItem key={audience.id} value={audience.id}>
                        {audience.name} ({audience.approximate_count?.toLocaleString() || '?'} pessoas)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
