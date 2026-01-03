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
import { Clock, Save, Loader2, Trash2, Settings, Lightbulb, Sparkles, Type, RotateCcw, History, Image, Upload, X, Wand2, Copy } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SUGGESTED_PROMPT = `Se baseie 100% nas imagens de referência para criar as variações de imagem dos criativos. Todos os criativos de imagem gerado devem ter o texto da headline na imagem. Todos os textos gerados nas imagens devem ser 100% em português do Brasil`;
import { Textarea } from "@/components/ui/textarea";
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
import { FabricaTemasPesquisa } from "./FabricaTemasPesquisa";
import { FabricaCriativosGerados } from "./FabricaCriativosGerados";
import { FabricaCriativosHistorico } from "./FabricaCriativosHistorico";


interface ScheduleConfig {
  id?: string;
  is_active: boolean;
  creatives_per_day: number;
  concept_percentage: number;
  iteration_percentage: number;
  generation_time: string;
  always_include_text_in_images: boolean;
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
  creatives_per_day: 5,
  concept_percentage: 70,
  iteration_percentage: 30,
  generation_time: "08:00",
  always_include_text_in_images: true,
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

export function ClienteConfiguracaoFabricaCriativos({ clientId, onSave, onDelete }: Props) {
  const { activeCompany } = useCompany();
  const [config, setConfig] = useState<ScheduleConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  
  const [hasResearchThemes, setHasResearchThemes] = useState(false);
  const [hasPreviousCreatives, setHasPreviousCreatives] = useState(false);

  useEffect(() => {
    if (clientId) {
      loadConfig();
      checkAvailability();
    }
  }, [clientId]);

  const checkAvailability = async () => {
    if (!clientId || !activeCompany?.company_id) return;

    try {
      const { count: themesCount } = await supabase
        .from('market_research_insights')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('company_id', activeCompany.company_id);
      
      setHasResearchThemes((themesCount || 0) > 0);

      const { count: creativesCount } = await supabase
        .from('creative_generation_queue')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .in('status', ['approved', 'published']);
      
      setHasPreviousCreatives((creativesCount || 0) > 0);
    } catch (error) {
      console.error('Error checking availability:', error);
    }
  };

  const loadConfig = async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('creative_generation_schedules')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          id: data.id,
          is_active: data.is_active,
          creatives_per_day: data.creatives_per_day,
          concept_percentage: data.concept_percentage,
          iteration_percentage: data.iteration_percentage,
          generation_time: data.generation_time,
          always_include_text_in_images: data.always_include_text_in_images ?? true,
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
        creatives_per_day: config.creatives_per_day,
        concept_percentage: config.concept_percentage,
        iteration_percentage: config.iteration_percentage,
        generation_time: config.generation_time,
        always_include_text_in_images: config.always_include_text_in_images,
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
          .from('creative_generation_schedules')
          .update(configData)
          .eq('id', config.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('creative_generation_schedules')
          .insert(configData);
        
        if (error) throw error;
      }

      toast.success('Configurações salvas!');
      onSave?.();
      loadConfig();
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteConfig = async () => {
    if (!config.id) return;

    try {
      const { error } = await supabase
        .from('creative_generation_schedules')
        .delete()
        .eq('id', config.id);
      
      if (error) throw error;

      toast.success('Fábrica removida!');
      onDelete?.();
    } catch (error: any) {
      console.error('Error deleting config:', error);
      toast.error('Erro ao remover: ' + error.message);
    }
  };

  const resetGenerationForToday = async () => {
    if (!config.id) {
      toast.error('Salve a configuração primeiro');
      return;
    }

    setResetting(true);
    try {
      const { error } = await supabase
        .from('creative_generation_schedules')
        .update({ last_generation_at: null })
        .eq('id', config.id);

      if (error) throw error;

      toast.success('Reset realizado!');
    } catch (error: any) {
      console.error('Error resetting:', error);
      toast.error('Erro ao resetar: ' + error.message);
    } finally {
      setResetting(false);
    }
  };

  const handleImageUpload = async (file: File, index: number) => {
    setUploading(index);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${clientId}/${Date.now()}-ref-${index}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('visual-creatives')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('visual-creatives')
        .getPublicUrl(fileName);

      const fieldName = `reference_image_${index}` as keyof ScheduleConfig;
      setConfig(prev => ({ ...prev, [fieldName]: publicUrl }));
      toast.success('Imagem enviada!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveImage = (index: number) => {
    const fieldName = `reference_image_${index}` as keyof ScheduleConfig;
    setConfig(prev => ({ ...prev, [fieldName]: null }));
  };

  const referenceImages = [1, 2, 3, 4, 5, 6].map(i => ({
    index: i,
    url: config[`reference_image_${i}` as keyof ScheduleConfig] as string | null,
  }));

  const updatePercentages = (field: 'concept_percentage' | 'iteration_percentage', value: number) => {
    const newConfig = { ...config };
    newConfig[field] = value;
    
    if (field === 'concept_percentage') {
      newConfig.iteration_percentage = 100 - value;
    } else {
      newConfig.concept_percentage = 100 - value;
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
                  Esta ação não pode ser desfeita.
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
          Salvar
        </Button>
      </div>

      <Tabs defaultValue="geral" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="geral" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="temas" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Temas
          </TabsTrigger>
          <TabsTrigger value="criativos" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Criativos
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6">
          {/* Primeira linha: Configuração Geral + Distribuição de Tipos */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Geração Diária
                </CardTitle>
                <CardDescription>Configure a geração automática de criativos</CardDescription>
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
                  <Label htmlFor="creatives_per_day">Criativos por dia: {config.creatives_per_day}</Label>
                  <Slider
                    id="creatives_per_day"
                    min={1}
                    max={20}
                    step={1}
                    value={[config.creatives_per_day]}
                    onValueChange={([value]) => setConfig({ ...config, creatives_per_day: value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="generation_time">Horário de geração</Label>
                  <div className="flex gap-2">
                    <Input
                      id="generation_time"
                      type="time"
                      value={config.generation_time}
                      onChange={(e) => setConfig({ ...config, generation_time: e.target.value })}
                      className="flex-1"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={resetGenerationForToday}
                      disabled={resetting || !config.id}
                      title="Resetar para gerar hoje"
                    >
                      {resetting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Clique no botão de reset para permitir geração novamente hoje
                  </p>
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Distribuição de Tipos
                </CardTitle>
                <CardDescription>
                  Como dividir os criativos entre pesquisa e iterações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      <Label>Pesquisa (Conceito)</Label>
                    </div>
                    <span className="text-lg font-semibold">{config.concept_percentage}%</span>
                  </div>
                  <Slider
                    value={[config.concept_percentage]}
                    onValueChange={([value]) => updatePercentages('concept_percentage', value)}
                    min={0}
                    max={100}
                    step={5}
                    disabled={!hasResearchThemes}
                  />
                  {!hasResearchThemes && (
                    <p className="text-xs text-muted-foreground">
                      Adicione temas de pesquisa para habilitar
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-blue-500" />
                      <Label>Iterações</Label>
                    </div>
                    <span className="text-lg font-semibold">{config.iteration_percentage}%</span>
                  </div>
                  <Slider
                    value={[config.iteration_percentage]}
                    onValueChange={([value]) => updatePercentages('iteration_percentage', value)}
                    min={0}
                    max={100}
                    step={5}
                    disabled={!hasPreviousCreatives}
                  />
                  {!hasPreviousCreatives && (
                    <p className="text-xs text-muted-foreground">
                      Aprove criativos para habilitar iterações
                    </p>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm">
                    <strong>Pesquisa:</strong> Criativos baseados em temas de pesquisa de mercado
                  </p>
                  <p className="text-sm mt-1">
                    <strong>Iterações:</strong> Variações de criativos aprovados anteriormente
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Segunda linha: Prompt Personalizado (largura total) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Prompt Personalizado para Imagens
              </CardTitle>
              <CardDescription>
                Instruções adicionais para a IA ao gerar as imagens dos criativos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sugestão de Prompt */}
              <Alert className="bg-amber-500/10 border-amber-500/30">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <AlertDescription className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">Sugestão de prompt:</p>
                    <p className="text-xs text-muted-foreground italic">
                      "{SUGGESTED_PROMPT}"
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setConfig({ ...config, custom_image_prompt: SUGGESTED_PROMPT });
                      toast.success("Prompt sugerido aplicado!");
                    }}
                    className="shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Usar
                  </Button>
                </AlertDescription>
              </Alert>

              <Textarea
                placeholder="Ex: Usar cores vibrantes e modernas, foco em pessoas sorrindo, estilo minimalista, incluir o produto em destaque..."
                value={config.custom_image_prompt || ''}
                onChange={(e) => setConfig({ ...config, custom_image_prompt: e.target.value || null })}
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                Este prompt será somado ao prompt padrão de geração de imagens. Use para definir estilos visuais específicos, direções criativas ou elementos que devem aparecer em todos os criativos.
              </p>
            </CardContent>
          </Card>

          {/* Terceira linha: Imagens de Referência (6 em uma linha) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Imagens de Referência
              </CardTitle>
              <CardDescription>
                Até 6 imagens para a IA usar como referência visual
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-6 gap-4">
                {referenceImages.map(({ index, url }) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 overflow-hidden group"
                  >
                    {url ? (
                      <>
                        <img
                          src={url}
                          alt={`Referência ${index}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 text-center">
                          Ref {index}
                        </div>
                      </>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-muted/50 transition-colors">
                        {uploading === index ? (
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                            <span className="text-xs text-muted-foreground">Upload</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, index);
                          }}
                          disabled={uploading !== null}
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Estas imagens serão usadas como referência visual para gerar os criativos. Se não configuradas, a IA usará as imagens de referência do cadastro do cliente.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="temas">
          <FabricaTemasPesquisa clientId={clientId} conceptPercentage={config.concept_percentage} />
        </TabsContent>


        <TabsContent value="criativos">
          <FabricaCriativosGerados clientId={clientId} />
        </TabsContent>

        <TabsContent value="historico">
          <FabricaCriativosHistorico clientId={clientId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
