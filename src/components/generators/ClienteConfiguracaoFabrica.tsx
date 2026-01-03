import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Zap, Clock, Target, Save, Loader2, Trash2, Settings, Users, Lightbulb, Sparkles, Type, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FabricaCompetidores } from "./FabricaCompetidores";
import { FabricaTemasPesquisa } from "./FabricaTemasPesquisa";
import { FabricaAnunciosGerados } from "./FabricaAnunciosGerados";
import { FabricaConfiguracoesAvancadas } from "./FabricaConfiguracoesAvancadas";

interface ScheduleConfig {
  id?: string;
  is_active: boolean;
  ads_per_day: number;
  clone_percentage: number;
  concept_percentage: number;
  iteration_percentage: number;
  generation_time: string;
  autopilot_enabled: boolean;
  autopilot_min_quality_score: number;
  autopilot_max_daily_budget: number;
  always_include_text_in_images: boolean;
  // Advanced config
  target_campaign_id: string | null;
  target_adset_id: string | null;
  custom_image_prompt: string | null;
  reference_image_1: string | null;
  reference_image_2: string | null;
  reference_image_3: string | null;
  reference_image_4: string | null;
  reference_image_5: string | null;
  reference_image_6: string | null;
}

const defaultConfig: ScheduleConfig = {
  is_active: true,
  ads_per_day: 10,
  clone_percentage: 20,
  concept_percentage: 50,
  iteration_percentage: 30,
  generation_time: "08:00",
  autopilot_enabled: false,
  autopilot_min_quality_score: 80,
  autopilot_max_daily_budget: 500,
  always_include_text_in_images: true,
  // Advanced config defaults
  target_campaign_id: null,
  target_adset_id: null,
  custom_image_prompt: null,
  reference_image_1: null,
  reference_image_2: null,
  reference_image_3: null,
  reference_image_4: null,
  reference_image_5: null,
  reference_image_6: null,
};

interface Props {
  clientId: string;
  onSave?: () => void;
  onDelete?: () => void;
}

export function ClienteConfiguracaoFabrica({ clientId, onSave, onDelete }: Props) {
  const { activeCompany } = useCompany();
  const [config, setConfig] = useState<ScheduleConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Availability states
  const [hasCompetitors, setHasCompetitors] = useState(false);
  const [hasResearchThemes, setHasResearchThemes] = useState(false);
  const [hasCampaigns, setHasCampaigns] = useState(false);

  useEffect(() => {
    if (clientId) {
      loadConfig();
      checkAvailability();
    }
  }, [clientId]);

  const checkAvailability = async () => {
    if (!clientId || !activeCompany?.company_id) return;

    try {
      // Check for competitors
      const { count: competitorsCount } = await supabase
        .from('competitors')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('company_id', activeCompany.company_id);
      
      setHasCompetitors((competitorsCount || 0) > 0);

      // Check for research themes (market_research_insights)
      const { count: themesCount } = await supabase
        .from('market_research_insights')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('company_id', activeCompany.company_id);
      
      setHasResearchThemes((themesCount || 0) > 0);

      // Check for campaigns
      const { count: campaignsCount } = await supabase
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('is_active', true);
      
      setHasCampaigns((campaignsCount || 0) > 0);
    } catch (error) {
      console.error('Error checking availability:', error);
    }
  };

  const loadConfig = async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ad_generation_schedules')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Percentuais são inteiros (0-100) no banco.
        // autopilot_min_quality_score é numeric(3,2) (0-9.99), então salvamos como 0-1.
        setConfig({
          id: data.id,
          is_active: data.is_active,
          ads_per_day: data.ads_per_day,
          clone_percentage: data.clone_percentage,
          concept_percentage: data.concept_percentage,
          iteration_percentage: data.iteration_percentage,
          generation_time: data.generation_time,
          autopilot_enabled: data.autopilot_enabled,
          autopilot_min_quality_score: Math.round(((data.autopilot_min_quality_score ?? 0.8) as number) * 100),
          autopilot_max_daily_budget: Number(data.autopilot_max_daily_budget ?? 500),
          always_include_text_in_images: data.always_include_text_in_images ?? true,
          // Advanced config
          target_campaign_id: data.target_campaign_id ?? null,
          target_adset_id: data.target_adset_id ?? null,
          custom_image_prompt: data.custom_image_prompt ?? null,
          reference_image_1: data.reference_image_1 ?? null,
          reference_image_2: data.reference_image_2 ?? null,
          reference_image_3: data.reference_image_3 ?? null,
          reference_image_4: data.reference_image_4 ?? null,
          reference_image_5: data.reference_image_5 ?? null,
          reference_image_6: data.reference_image_6 ?? null,
        });
      } else {
        setConfig(defaultConfig);
      }
    } catch (error) {
      console.error('Error loading config:', error);
      setConfig(defaultConfig);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!clientId || !activeCompany?.company_id) return;

    setSaving(true);
    try {
      const configData = {
        client_id: clientId,
        company_id: activeCompany.company_id,
        is_active: config.is_active,
        ads_per_day: config.ads_per_day,
        // Percentuais são inteiros no banco (0-100)
        clone_percentage: config.clone_percentage,
        concept_percentage: config.concept_percentage,
        iteration_percentage: config.iteration_percentage,
        generation_time: config.generation_time,
        autopilot_enabled: config.autopilot_enabled,
        // numeric(3,2) no banco (0-9.99): salvar como 0-1 com 2 casas
        autopilot_min_quality_score: Number((config.autopilot_min_quality_score / 100).toFixed(2)),
        // numeric(10,2) no banco
        autopilot_max_daily_budget: Number(config.autopilot_max_daily_budget),
        always_include_text_in_images: config.always_include_text_in_images,
        // Advanced config
        target_campaign_id: config.target_campaign_id,
        target_adset_id: config.target_adset_id,
        custom_image_prompt: config.custom_image_prompt,
        reference_image_1: config.reference_image_1,
        reference_image_2: config.reference_image_2,
        reference_image_3: config.reference_image_3,
        reference_image_4: config.reference_image_4,
        reference_image_5: config.reference_image_5,
        reference_image_6: config.reference_image_6,
      };

      if (config.id) {
        const { error } = await supabase
          .from('ad_generation_schedules')
          .update(configData)
          .eq('id', config.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ad_generation_schedules')
          .insert(configData);
        
        if (error) throw error;
      }

      toast.success('Configurações salvas com sucesso!');
      onSave?.();
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast.error('Erro ao salvar configurações: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteConfig = async () => {
    if (!config.id) return;

    try {
      const { error } = await supabase
        .from('ad_generation_schedules')
        .delete()
        .eq('id', config.id);
      
      if (error) throw error;

      toast.success('Fábrica removida com sucesso!');
      onDelete?.();
    } catch (error: any) {
      console.error('Error deleting config:', error);
      toast.error('Erro ao remover fábrica: ' + error.message);
    }
  };

  const updatePercentages = (field: keyof ScheduleConfig, value: number, disabled: boolean = false) => {
    if (disabled) return;
    
    const total = 100;
    const newConfig = { ...config, [field]: value };
    
    // Get available fields (only those that are not disabled)
    const allFields: (keyof ScheduleConfig)[] = ['clone_percentage', 'concept_percentage', 'iteration_percentage'];
    const availableFields = allFields.filter(f => {
      if (f === 'clone_percentage') return hasCompetitors;
      if (f === 'concept_percentage') return hasResearchThemes;
      if (f === 'iteration_percentage') return hasCampaigns;
      return true;
    });
    
    const otherFields = availableFields.filter(f => f !== field);
    const remaining = total - value;
    const currentOtherTotal = otherFields.reduce((sum, f) => sum + (config[f] as number), 0);
    
    if (currentOtherTotal > 0) {
      otherFields.forEach(f => {
        const ratio = (config[f] as number) / currentOtherTotal;
        (newConfig as any)[f] = Math.round(remaining * ratio);
      });
    } else if (otherFields.length > 0) {
      // Distribute equally if current total is 0
      const perField = Math.floor(remaining / otherFields.length);
      otherFields.forEach((f, idx) => {
        (newConfig as any)[f] = idx === otherFields.length - 1 
          ? remaining - perField * (otherFields.length - 1) 
          : perField;
      });
    }
    
    // Ensure disabled fields are always 0
    if (!hasCompetitors) newConfig.clone_percentage = 0;
    if (!hasResearchThemes) newConfig.concept_percentage = 0;
    if (!hasCampaigns) newConfig.iteration_percentage = 0;
    
    setConfig(newConfig);
  };

  // Effect to reset disabled percentages when availability changes
  useEffect(() => {
    const newConfig = { ...config };
    let changed = false;
    
    if (!hasCompetitors && config.clone_percentage > 0) {
      newConfig.clone_percentage = 0;
      changed = true;
    }
    if (!hasResearchThemes && config.concept_percentage > 0) {
      newConfig.concept_percentage = 0;
      changed = true;
    }
    if (!hasCampaigns && config.iteration_percentage > 0) {
      newConfig.iteration_percentage = 0;
      changed = true;
    }
    
    if (changed) {
      // Redistribute to available types
      const availableCount = [hasCompetitors, hasResearchThemes, hasCampaigns].filter(Boolean).length;
      if (availableCount > 0) {
        const perType = Math.floor(100 / availableCount);
        let remaining = 100;
        
        if (hasCompetitors) {
          newConfig.clone_percentage = perType;
          remaining -= perType;
        }
        if (hasResearchThemes) {
          newConfig.concept_percentage = hasCompetitors ? perType : remaining;
          remaining -= newConfig.concept_percentage;
        }
        if (hasCampaigns) {
          newConfig.iteration_percentage = remaining;
        }
      }
      
      setConfig(newConfig);
    }
  }, [hasCompetitors, hasResearchThemes, hasCampaigns]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        {config.id && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Remover Fábrica
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover fábrica?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. A fábrica será removida permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={deleteConfig}>Remover</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <Button onClick={saveConfig} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Configurações
        </Button>
      </div>

      <Tabs defaultValue="geral" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="geral" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="concorrentes" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Concorrentes
          </TabsTrigger>
          <TabsTrigger value="temas" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Temas de Pesquisa
          </TabsTrigger>
          <TabsTrigger value="anuncios" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Anúncios Gerados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Geração Diária */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Geração Diária
                </CardTitle>
                <CardDescription>Configure a geração automática de anúncios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">Geração ativa</Label>
                  <Switch
                    id="is_active"
                    checked={config.is_active}
                    onCheckedChange={(checked) => setConfig({ ...config, is_active: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ads_per_day">Anúncios por dia: {config.ads_per_day}</Label>
                  <Slider
                    id="ads_per_day"
                    min={1}
                    max={50}
                    step={1}
                    value={[config.ads_per_day]}
                    onValueChange={([value]) => setConfig({ ...config, ads_per_day: value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="generation_time">Horário de geração</Label>
                  <Input
                    id="generation_time"
                    type="time"
                    value={config.generation_time}
                    onChange={(e) => setConfig({ ...config, generation_time: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="space-y-0.5">
                    <Label htmlFor="always_include_text" className="flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      Texto nas imagens
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Sempre incluir headline/texto nos criativos
                    </p>
                  </div>
                  <Switch
                    id="always_include_text"
                    checked={config.always_include_text_in_images}
                    onCheckedChange={(checked) => setConfig({ ...config, always_include_text_in_images: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Distribuição */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Distribuição de Tipos
                </CardTitle>
                <CardDescription>Define a proporção de cada tipo de anúncio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Clone - Concorrentes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className={!hasCompetitors ? "text-muted-foreground" : ""}>
                      Clones (concorrentes): {config.clone_percentage}%
                    </Label>
                    {!hasCompetitors && (
                      <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                        <AlertCircle className="h-3 w-3" />
                        Sem concorrentes
                      </span>
                    )}
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[config.clone_percentage]}
                    onValueChange={([value]) => updatePercentages('clone_percentage', value, !hasCompetitors)}
                    disabled={!hasCompetitors}
                    className={!hasCompetitors ? "opacity-50 cursor-not-allowed" : ""}
                  />
                  {!hasCompetitors && (
                    <p className="text-xs text-muted-foreground">
                      Configure concorrentes na aba "Concorrentes" para ativar este tipo.
                    </p>
                  )}
                </div>

                {/* Concept - Temas de Pesquisa */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className={!hasResearchThemes ? "text-muted-foreground" : ""}>
                      Conceitos (pesquisa): {config.concept_percentage}%
                    </Label>
                    {!hasResearchThemes && (
                      <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                        <AlertCircle className="h-3 w-3" />
                        Sem temas
                      </span>
                    )}
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[config.concept_percentage]}
                    onValueChange={([value]) => updatePercentages('concept_percentage', value, !hasResearchThemes)}
                    disabled={!hasResearchThemes}
                    className={!hasResearchThemes ? "opacity-50 cursor-not-allowed" : ""}
                  />
                  {!hasResearchThemes && (
                    <p className="text-xs text-muted-foreground">
                      Adicione temas na aba "Temas de Pesquisa" para ativar este tipo.
                    </p>
                  )}
                </div>

                {/* Iteration - Campanhas/Winners */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className={!hasCampaigns ? "text-muted-foreground" : ""}>
                      Iterações (vencedores): {config.iteration_percentage}%
                    </Label>
                    {!hasCampaigns && (
                      <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                        <AlertCircle className="h-3 w-3" />
                        Sem campanhas
                      </span>
                    )}
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[config.iteration_percentage]}
                    onValueChange={([value]) => updatePercentages('iteration_percentage', value, !hasCampaigns)}
                    disabled={!hasCampaigns}
                    className={!hasCampaigns ? "opacity-50 cursor-not-allowed" : ""}
                  />
                  {!hasCampaigns && (
                    <p className="text-xs text-muted-foreground">
                      Sincronize campanhas do Meta para ativar este tipo.
                    </p>
                  )}
                </div>

                <div className="text-sm text-muted-foreground">
                  Total: {config.clone_percentage + config.concept_percentage + config.iteration_percentage}%
                </div>
              </CardContent>
            </Card>

            {/* Autopilot */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Modo Autopilot
                </CardTitle>
                <CardDescription>
                  Publica automaticamente anúncios aprovados com alto score de qualidade
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="autopilot_enabled">Ativar Autopilot</Label>
                    <p className="text-sm text-muted-foreground">
                      Anúncios com score acima do mínimo serão publicados automaticamente
                    </p>
                  </div>
                  <Switch
                    id="autopilot_enabled"
                    checked={config.autopilot_enabled}
                    onCheckedChange={(checked) => setConfig({ ...config, autopilot_enabled: checked })}
                  />
                </div>

                {config.autopilot_enabled && (
                  <div className="grid gap-6 md:grid-cols-2 pt-4 border-t">
                    <div className="space-y-2">
                      <Label>Score mínimo de qualidade: {config.autopilot_min_quality_score}%</Label>
                      <Slider
                        min={50}
                        max={100}
                        step={5}
                        value={[config.autopilot_min_quality_score]}
                        onValueChange={([value]) => setConfig({ ...config, autopilot_min_quality_score: value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Apenas anúncios com score igual ou acima serão publicados automaticamente
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="autopilot_max_budget">Orçamento diário máximo (R$)</Label>
                      <Input
                        id="autopilot_max_budget"
                        type="number"
                        min={10}
                        value={config.autopilot_max_daily_budget}
                        onChange={(e) => setConfig({ ...config, autopilot_max_daily_budget: Number(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Limite máximo de gastos diários com anúncios publicados automaticamente
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Configurações Avançadas */}
          <FabricaConfiguracoesAvancadas
            clientId={clientId}
            config={{
              target_campaign_id: config.target_campaign_id,
              target_adset_id: config.target_adset_id,
              custom_image_prompt: config.custom_image_prompt,
              reference_image_1: config.reference_image_1,
              reference_image_2: config.reference_image_2,
              reference_image_3: config.reference_image_3,
              reference_image_4: config.reference_image_4,
              reference_image_5: config.reference_image_5,
              reference_image_6: config.reference_image_6,
            }}
            onChange={(advancedConfig) => setConfig({ ...config, ...advancedConfig })}
          />
        </TabsContent>

        <TabsContent value="concorrentes">
          <FabricaCompetidores clientId={clientId} clonePercentage={config.clone_percentage} />
        </TabsContent>

        <TabsContent value="temas">
          <FabricaTemasPesquisa clientId={clientId} conceptPercentage={config.concept_percentage} />
        </TabsContent>

        <TabsContent value="anuncios">
          <FabricaAnunciosGerados clientId={clientId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
