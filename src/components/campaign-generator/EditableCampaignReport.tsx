import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, FileText, Share2, CheckCircle, Save, Edit, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGeneratedCampaigns } from "@/hooks/useGeneratedCampaigns";
import { useState, useEffect } from "react";
import type { GeneratedCampaign } from "@/hooks/useGeneratedCampaigns";

interface EditableCampaignReportProps {
  campaign: GeneratedCampaign;
  onSave?: () => void;
}

export function EditableCampaignReport({ campaign, onSave }: EditableCampaignReportProps) {
  const { toast } = useToast();
  const { updateCampaign } = useGeneratedCampaigns();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedCampaign, setEditedCampaign] = useState<GeneratedCampaign>(campaign);

  useEffect(() => {
    setEditedCampaign(campaign);
  }, [campaign]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateCampaign(editedCampaign.id, {
        title: editedCampaign.title,
        funnel_stage: editedCampaign.funnel_stage,
        campaign_type: editedCampaign.campaign_type,
        configuration: editedCampaign.configuration,
        creatives: editedCampaign.creatives
      });
      
      toast({
        title: "Campanha atualizada",
        description: "As alterações foram salvas com sucesso!",
      });
      
      setIsEditing(false);
      onSave?.();
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    toast({
      title: "Exportação Iniciada",
      description: "O relatório da campanha será baixado em breve",
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link Copiado",
      description: "Link do relatório copiado para a área de transferência",
    });
  };

  const updateConfiguration = (field: string, value: any) => {
    setEditedCampaign(prev => ({
      ...prev,
      configuration: {
        ...prev.configuration,
        [field]: value
      }
    }));
  };

  const updateTargeting = (field: string, value: any) => {
    setEditedCampaign(prev => ({
      ...prev,
      configuration: {
        ...prev.configuration,
        targeting: {
          ...prev.configuration.targeting,
          [field]: value
        }
      }
    }));
  };

  const updateBudget = (field: string, value: any) => {
    setEditedCampaign(prev => ({
      ...prev,
      configuration: {
        ...prev.configuration,
        budget: {
          ...prev.configuration.budget,
          [field]: value
        }
      }
    }));
  };

  const updateCreative = (creativeIndex: number, field: string, value: any) => {
    setEditedCampaign(prev => ({
      ...prev,
      creatives: prev.creatives.map((creative: any, index: number) => 
        index === creativeIndex ? { ...creative, [field]: value } : creative
      )
    }));
  };

  const { configuration = {}, creatives = [] } = editedCampaign;

  const getFunnelStageLabel = (stage: string) => {
    const labels = {
      topo: "Topo",
      meio: "Meio", 
      fundo: "Fundo",
      retencao: "Retenção"
    };
    return labels[stage as keyof typeof labels] || stage;
  };

  const getCampaignTypeLabel = (type: string) => {
    const labels = {
      awareness: "Reconhecimento",
      traffic: "Tráfego",
      leads: "Leads",
      conversions: "Conversões",
      remarketing: "Remarketing",
      retention: "Retenção"
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <Label htmlFor="title">Título da Campanha</Label>
              <Input
                id="title"
                value={editedCampaign.title}
                onChange={(e) => setEditedCampaign(prev => ({ ...prev, title: e.target.value }))}
                className="max-w-md"
              />
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold mb-2">{editedCampaign.title}</h3>
              <p className="text-muted-foreground">
                Estratégia completa para <strong>{editedCampaign.clients?.name}</strong>
              </p>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)} className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Editar
              </Button>
              <Button variant="outline" onClick={handleShare} className="flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Compartilhar
              </Button>
              <Button onClick={handleExport} className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exportar PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Resumo Executivo */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Resumo Executivo
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="space-y-2">
            {isEditing ? (
              <div>
                <Label>Orçamento Diário (R$)</Label>
                <Input
                  type="number"
                  value={configuration.budget?.daily || 0}
                  onChange={(e) => updateBudget('daily', Number(e.target.value))}
                />
              </div>
            ) : (
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-lg font-bold text-primary">R$ {configuration.budget?.daily}</div>
                <div className="text-sm text-muted-foreground">Orçamento Diário</div>
              </div>
            )}
          </div>
          
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-lg font-bold text-primary">{configuration.adSets?.length || 3}</div>
            <div className="text-sm text-muted-foreground">Conjuntos de Anúncios</div>
          </div>
          
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-lg font-bold text-primary">{creatives.length}</div>
            <div className="text-sm text-muted-foreground">Criativos Gerados</div>
          </div>
          
          <div className="space-y-2">
            {isEditing ? (
              <div>
                <Label>Duração (dias)</Label>
                <Input
                  type="number"
                  value={configuration.schedule?.duration || 30}
                  onChange={(e) => updateConfiguration('schedule', { 
                    ...configuration.schedule, 
                    duration: Number(e.target.value) 
                  })}
                />
              </div>
            ) : (
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-lg font-bold text-primary">{configuration.schedule?.duration}</div>
                <div className="text-sm text-muted-foreground">Dias de Veiculação</div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            <div className="flex gap-4">
              <div>
                <Label>Funil</Label>
                <Select 
                  value={editedCampaign.funnel_stage}
                  onValueChange={(value) => setEditedCampaign(prev => ({ ...prev, funnel_stage: value }))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="topo">Topo</SelectItem>
                    <SelectItem value="meio">Meio</SelectItem>
                    <SelectItem value="fundo">Fundo</SelectItem>
                    <SelectItem value="retencao">Retenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select 
                  value={editedCampaign.campaign_type}
                  onValueChange={(value) => setEditedCampaign(prev => ({ ...prev, campaign_type: value }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="awareness">Reconhecimento</SelectItem>
                    <SelectItem value="traffic">Tráfego</SelectItem>
                    <SelectItem value="leads">Leads</SelectItem>
                    <SelectItem value="conversions">Conversões</SelectItem>
                    <SelectItem value="remarketing">Remarketing</SelectItem>
                    <SelectItem value="retention">Retenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <>
              <Badge>{getFunnelStageLabel(editedCampaign.funnel_stage)}</Badge>
              <Badge variant="outline">{getCampaignTypeLabel(editedCampaign.campaign_type)}</Badge>
              <Badge variant="secondary">{editedCampaign.clients?.company}</Badge>
            </>
          )}
        </div>
      </Card>

      {/* Estrutura da Campanha */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Estrutura da Campanha</h4>
        <div className="space-y-6">
          <div>
            <h5 className="font-medium mb-2">Segmentação Detalhada</h5>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Demografia</Label>
                  {isEditing ? (
                    <Textarea
                      value={configuration.targeting?.demographics || ''}
                      onChange={(e) => updateTargeting('demographics', e.target.value)}
                      className="min-h-20"
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                      {configuration.targeting?.demographics || 'Não especificado'}
                    </div>
                  )}
                </div>
                <div>
                  <Label>Alcance Estimado</Label>
                  {isEditing ? (
                    <Input
                      value={configuration.targeting?.estimatedReach || ''}
                      onChange={(e) => updateTargeting('estimatedReach', e.target.value)}
                      placeholder="Ex: 10.000-25.000"
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                      {configuration.targeting?.estimatedReach || 'Não especificado'} pessoas
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <Label>Comportamentos e Funções</Label>
                {isEditing ? (
                  <Textarea
                    value={configuration.targeting?.behaviors || ''}
                    onChange={(e) => updateTargeting('behaviors', e.target.value)}
                    className="min-h-20"
                  />
                ) : (
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    {configuration.targeting?.behaviors || 'Não especificado'}
                  </div>
                )}
              </div>

              {configuration.targeting?.interests && (
                <div>
                  <Label>Interesses Específicos</Label>
                  {isEditing ? (
                    <Textarea
                      value={Array.isArray(configuration.targeting.interests) 
                        ? configuration.targeting.interests.join(', ') 
                        : configuration.targeting.interests}
                      onChange={(e) => updateTargeting('interests', e.target.value.split(', '))}
                      placeholder="Separe os interesses por vírgula"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(configuration.targeting.interests) 
                        ? configuration.targeting.interests 
                        : [configuration.targeting.interests]
                      ).map((interest: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Conjuntos de Anúncios Específicos */}
              {configuration.adSets && configuration.adSets.length > 0 && (
                <div>
                  <Label className="text-base font-semibold">Segmentações por Conjunto</Label>
                  <div className="space-y-4 mt-3">
                    {configuration.adSets.map((adSet: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4 bg-background">
                        <div className="space-y-3">
                          <div>
                            <Label>Nome do Conjunto {index + 1}</Label>
                            {isEditing ? (
                              <Input
                                value={adSet.name || ''}
                                onChange={(e) => {
                                  const updatedAdSets = [...configuration.adSets];
                                  updatedAdSets[index] = { ...adSet, name: e.target.value };
                                  updateConfiguration('adSets', updatedAdSets);
                                }}
                              />
                            ) : (
                              <div className="text-sm font-medium text-primary">{adSet.name}</div>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label>Orçamento Diário (R$)</Label>
                              {isEditing ? (
                                <Input
                                  type="number"
                                  value={adSet.budget || 0}
                                  onChange={(e) => {
                                    const updatedAdSets = [...configuration.adSets];
                                    updatedAdSets[index] = { ...adSet, budget: Number(e.target.value) };
                                    updateConfiguration('adSets', updatedAdSets);
                                  }}
                                />
                              ) : (
                                <div className="text-sm text-muted-foreground">R$ {adSet.budget}/dia</div>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <Label>Segmentação Específica</Label>
                            {isEditing ? (
                              <Textarea
                                value={adSet.targeting || ''}
                                onChange={(e) => {
                                  const updatedAdSets = [...configuration.adSets];
                                  updatedAdSets[index] = { ...adSet, targeting: e.target.value };
                                  updateConfiguration('adSets', updatedAdSets);
                                }}
                                className="min-h-20"
                                placeholder="Descreva a segmentação específica deste conjunto"
                              />
                            ) : (
                              <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
                                {adSet.targeting}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <Label>Estratégia de Lance</Label>
            {isEditing ? (
              <Textarea
                value={configuration.bidding?.strategy || ''}
                onChange={(e) => updateConfiguration('bidding', { 
                  ...configuration.bidding, 
                  strategy: e.target.value 
                })}
              />
            ) : (
              <p className="text-sm text-muted-foreground">{configuration.bidding?.strategy}</p>
            )}
          </div>
          
          <div>
            <Label>Horários Otimizados</Label>
            {isEditing ? (
              <Input
                value={configuration.schedule?.optimalHours || ''}
                onChange={(e) => updateConfiguration('schedule', { 
                  ...configuration.schedule, 
                  optimalHours: e.target.value 
                })}
                placeholder="Ex: 8h-22h (segunda a sexta)"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {configuration.schedule?.optimalHours}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Resumo dos Criativos */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Criativos por Conjunto</h4>
        <div className="space-y-6">
          {creatives.map((creative: any, index: number) => (
            <div key={creative.id || index} className="border rounded-lg p-4 bg-muted/20">
              <div className="flex items-center justify-between mb-4">
                <h5 className="font-medium">Conjunto {index + 1}: {creative.adSetName}</h5>
                <Badge variant="outline">1 principal + 2 variações</Badge>
              </div>
              
              {/* Criativo Principal */}
              <div className="mb-6 border rounded-lg p-4 bg-background">
                <div className="text-sm font-medium text-primary mb-3">Criativo Principal</div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label>Título</Label>
                      {isEditing ? (
                        <Textarea
                          value={creative.headline || ''}
                          onChange={(e) => updateCreative(index, 'headline', e.target.value)}
                          className="min-h-16"
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                          {creative.headline}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Texto Principal</Label>
                      {isEditing ? (
                        <Textarea
                          value={creative.primaryText || ''}
                          onChange={(e) => updateCreative(index, 'primaryText', e.target.value)}
                          className="min-h-16"
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                          {creative.primaryText}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Call to Action</Label>
                      {isEditing ? (
                        <Input
                          value={creative.callToAction || ''}
                          onChange={(e) => updateCreative(index, 'callToAction', e.target.value)}
                        />
                      ) : (
                        <div className="text-sm text-primary bg-primary/10 p-2 rounded">
                          {creative.callToAction}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Descrição</Label>
                    {isEditing ? (
                      <Textarea
                        value={creative.description || ''}
                        onChange={(e) => updateCreative(index, 'description', e.target.value)}
                        className="min-h-16"
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                        {creative.description}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label>Elemento Visual Sugerido</Label>
                    {isEditing ? (
                      <Textarea
                        value={creative.imageDescription || ''}
                        onChange={(e) => updateCreative(index, 'imageDescription', e.target.value)}
                        className="min-h-16"
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                        {creative.imageDescription}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Variações para Teste A/B */}
              <div className="space-y-4">
                <div className="text-sm font-medium text-primary">Variações para Teste A/B</div>
                
                {/* Variação A */}
                <div className="border rounded-lg p-4 bg-background/70">
                  <div className="text-sm font-medium text-muted-foreground mb-3">Variação A</div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Título Variação A</Label>
                        {isEditing ? (
                          <Textarea
                            value={creative.variations?.headline?.[0] || ''}
                            onChange={(e) => {
                              const variations = creative.variations || {};
                              const headlines = variations.headline || ['', ''];
                              headlines[0] = e.target.value;
                              updateCreative(index, 'variations', { ...variations, headline: headlines });
                            }}
                            className="min-h-12 text-xs"
                          />
                        ) : (
                          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                            {creative.variations?.headline?.[0] || creative.headline}
                          </div>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs">Texto Variação A</Label>
                        {isEditing ? (
                          <Textarea
                            value={creative.variations?.primaryText?.[0] || ''}
                            onChange={(e) => {
                              const variations = creative.variations || {};
                              const primaryTexts = variations.primaryText || ['', ''];
                              primaryTexts[0] = e.target.value;
                              updateCreative(index, 'variations', { ...variations, primaryText: primaryTexts });
                            }}
                            className="min-h-12 text-xs"
                          />
                        ) : (
                          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                            {creative.variations?.primaryText?.[0] || creative.primaryText}
                          </div>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs">Descrição Variação A</Label>
                        {isEditing ? (
                          <Textarea
                            value={creative.variations?.description?.[0] || ''}
                            onChange={(e) => {
                              const variations = creative.variations || {};
                              const descriptions = variations.description || ['', ''];
                              descriptions[0] = e.target.value;
                              updateCreative(index, 'variations', { ...variations, description: descriptions });
                            }}
                            className="min-h-12 text-xs"
                          />
                        ) : (
                          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                            {creative.variations?.description?.[0] || creative.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Variação B */}
                <div className="border rounded-lg p-4 bg-background/70">
                  <div className="text-sm font-medium text-muted-foreground mb-3">Variação B</div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Título Variação B</Label>
                        {isEditing ? (
                          <Textarea
                            value={creative.variations?.headline?.[1] || ''}
                            onChange={(e) => {
                              const variations = creative.variations || {};
                              const headlines = variations.headline || ['', ''];
                              headlines[1] = e.target.value;
                              updateCreative(index, 'variations', { ...variations, headline: headlines });
                            }}
                            className="min-h-12 text-xs"
                          />
                        ) : (
                          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                            {creative.variations?.headline?.[1] || creative.headline}
                          </div>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs">Texto Variação B</Label>
                        {isEditing ? (
                          <Textarea
                            value={creative.variations?.primaryText?.[1] || ''}
                            onChange={(e) => {
                              const variations = creative.variations || {};
                              const primaryTexts = variations.primaryText || ['', ''];
                              primaryTexts[1] = e.target.value;
                              updateCreative(index, 'variations', { ...variations, primaryText: primaryTexts });
                            }}
                            className="min-h-12 text-xs"
                          />
                        ) : (
                          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                            {creative.variations?.primaryText?.[1] || creative.primaryText}
                          </div>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs">Descrição Variação B</Label>
                        {isEditing ? (
                          <Textarea
                            value={creative.variations?.description?.[1] || ''}
                            onChange={(e) => {
                              const variations = creative.variations || {};
                              const descriptions = variations.description || ['', ''];
                              descriptions[1] = e.target.value;
                              updateCreative(index, 'variations', { ...variations, description: descriptions });
                            }}
                            className="min-h-12 text-xs"
                          />
                        ) : (
                          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                            {creative.variations?.description?.[1] || creative.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recomendações Estratégicas */}
      {configuration.recommendations && (
        <Card className="p-6 bg-primary/5 border-primary/20">
          <h4 className="font-semibold mb-4">Recomendações Estratégicas</h4>
          {isEditing ? (
            <div className="space-y-2">
              <Label>Recomendações (uma por linha)</Label>
              <Textarea
                value={Array.isArray(configuration.recommendations) 
                  ? configuration.recommendations.join('\n')
                  : configuration.recommendations}
                onChange={(e) => updateConfiguration('recommendations', e.target.value.split('\n').filter(r => r.trim()))}
                className="min-h-32"
                placeholder="Digite uma recomendação por linha"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {(Array.isArray(configuration.recommendations) 
                ? configuration.recommendations 
                : [configuration.recommendations]
              ).map((recommendation: string, index: number) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{recommendation}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Próximos Passos */}
      <Card className="p-6 bg-muted/50">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Próximos Passos
        </h4>
        <div className="space-y-2 text-sm">
          <p>✅ Revisar e aprovar a estratégia gerada</p>
          <p>⏳ Criar as campanhas no Facebook Ads Manager</p>
          <p>⏳ Produzir os elementos visuais sugeridos</p>
          <p>⏳ Configurar acompanhamento e métricas</p>
          <p>⏳ Iniciar testes A/B com as variações</p>
          <p>⏳ Monitorar performance e otimizar</p>
        </div>
      </Card>
    </div>
  );
}