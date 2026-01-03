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
import { Zap, Clock, Target, Save, Loader2, Trash2, Settings, Users, Lightbulb, Sparkles } from "lucide-react";
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

  useEffect(() => {
    if (clientId) {
      loadConfig();
    }
  }, [clientId]);

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

  const updatePercentages = (field: keyof ScheduleConfig, value: number) => {
    const total = 100;
    const newConfig = { ...config, [field]: value };
    
    const fields: (keyof ScheduleConfig)[] = ['clone_percentage', 'concept_percentage', 'iteration_percentage'];
    const otherFields = fields.filter(f => f !== field);
    const remaining = total - value;
    const currentOtherTotal = otherFields.reduce((sum, f) => sum + (config[f] as number), 0);
    
    if (currentOtherTotal > 0) {
      otherFields.forEach(f => {
        const ratio = (config[f] as number) / currentOtherTotal;
        (newConfig as any)[f] = Math.round(remaining * ratio);
      });
    }
    
    setConfig(newConfig);
  };

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
                <div className="space-y-2">
                  <Label>Clones (concorrentes): {config.clone_percentage}%</Label>
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[config.clone_percentage]}
                    onValueChange={([value]) => updatePercentages('clone_percentage', value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Conceitos (pesquisa): {config.concept_percentage}%</Label>
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[config.concept_percentage]}
                    onValueChange={([value]) => updatePercentages('concept_percentage', value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Iterações (vencedores): {config.iteration_percentage}%</Label>
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[config.iteration_percentage]}
                    onValueChange={([value]) => updatePercentages('iteration_percentage', value)}
                  />
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
