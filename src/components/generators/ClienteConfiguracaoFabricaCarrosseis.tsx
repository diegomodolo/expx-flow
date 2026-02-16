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
import { 
  Clock, Save, Loader2, Trash2, Settings, Lightbulb, Sparkles, 
  RotateCcw, History, Image, Upload, X, Wand2, Copy,
  BookOpen, Users, LayoutGrid, Moon, Sun, MessageSquare, Bookmark
} from "lucide-react";
import { ReferenceSelectionDialog } from "@/components/clients/ReferenceSelectionDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { FabricaCarrosseisGerados } from "./FabricaCarrosseisGerados";
import { FabricaCarrosseisHistorico } from "./FabricaCarrosseisHistorico";

const SUGGESTED_PROMPT = `Se baseie 100% nas imagens de referência para criar carrosseis seguindo as melhores práticas para empresas de software/SaaS. Inclua headlines claras e legíveis em cada slide. Mostre screenshots da interface quando relevante. Todos os textos devem ser 100% em português do Brasil. Seja muito fiel ao logotipo do cliente que esta presente nas imagens de referencia, NUNCA tente gerar um logotipo diferente.`;

interface ScheduleConfig {
  id?: string;
  is_active: boolean;
  carousels_per_day: number;
  slides_per_carousel: number;
  generation_time: string;
  // Type distribution
  tutorial_percentage: number;
  comparison_percentage: number;
  behind_scenes_percentage: number;
  curated_list_percentage: number;
  // Visual style
  use_dark_mode: boolean;
  show_ui_screenshots: boolean;
  include_proof_social: boolean;
  include_save_bait: boolean;
  custom_image_prompt: string | null;
  // Reference images
  reference_image_1: string | null;
  reference_image_2: string | null;
  reference_image_3: string | null;
  reference_image_4: string | null;
  reference_image_5: string | null;
  reference_image_6: string | null;
  reference_image_7: string | null;
  reference_image_8: string | null;
  reference_image_9: string | null;
  reference_image_10: string | null;
}

const defaultConfig: ScheduleConfig = {
  is_active: true,
  carousels_per_day: 3,
  slides_per_carousel: 8,
  generation_time: "09:00",
  tutorial_percentage: 25,
  comparison_percentage: 25,
  behind_scenes_percentage: 25,
  curated_list_percentage: 25,
  use_dark_mode: true,
  show_ui_screenshots: true,
  include_proof_social: true,
  include_save_bait: true,
  custom_image_prompt: null,
  reference_image_1: null,
  reference_image_2: null,
  reference_image_3: null,
  reference_image_4: null,
  reference_image_5: null,
  reference_image_6: null,
  reference_image_7: null,
  reference_image_8: null,
  reference_image_9: null,
  reference_image_10: null,
};

interface Props {
  clientId: string;
  onSave?: () => void;
  onDelete?: () => void;
}

export function ClienteConfiguracaoFabricaCarrosseis({ clientId, onSave, onDelete }: Props) {
  const { activeCompany } = useCompany();
  const [config, setConfig] = useState<ScheduleConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const [showReferenceDialog, setShowReferenceDialog] = useState(false);
  const [hasResearchThemes, setHasResearchThemes] = useState(false);

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
    } catch (error) {
      console.error('Error checking availability:', error);
    }
  };

  const loadConfig = async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('carousel_generation_schedules')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          id: data.id,
          is_active: data.is_active,
          carousels_per_day: data.carousels_per_day,
          slides_per_carousel: data.slides_per_carousel,
          generation_time: data.generation_time,
          tutorial_percentage: data.tutorial_percentage,
          comparison_percentage: data.comparison_percentage,
          behind_scenes_percentage: data.behind_scenes_percentage,
          curated_list_percentage: data.curated_list_percentage,
          use_dark_mode: data.use_dark_mode,
          show_ui_screenshots: data.show_ui_screenshots,
          include_proof_social: data.include_proof_social,
          include_save_bait: data.include_save_bait,
          custom_image_prompt: data.custom_image_prompt ?? null,
          reference_image_1: data.reference_image_1 ?? null,
          reference_image_2: data.reference_image_2 ?? null,
          reference_image_3: data.reference_image_3 ?? null,
          reference_image_4: data.reference_image_4 ?? null,
          reference_image_5: data.reference_image_5 ?? null,
          reference_image_6: data.reference_image_6 ?? null,
          reference_image_7: (data as any).reference_image_7 ?? null,
          reference_image_8: (data as any).reference_image_8 ?? null,
          reference_image_9: (data as any).reference_image_9 ?? null,
          reference_image_10: (data as any).reference_image_10 ?? null,
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
        carousels_per_day: config.carousels_per_day,
        slides_per_carousel: config.slides_per_carousel,
        generation_time: config.generation_time,
        tutorial_percentage: config.tutorial_percentage,
        comparison_percentage: config.comparison_percentage,
        behind_scenes_percentage: config.behind_scenes_percentage,
        curated_list_percentage: config.curated_list_percentage,
        use_dark_mode: config.use_dark_mode,
        show_ui_screenshots: config.show_ui_screenshots,
        include_proof_social: config.include_proof_social,
        include_save_bait: config.include_save_bait,
        custom_image_prompt: config.custom_image_prompt,
        reference_image_1: config.reference_image_1,
        reference_image_2: config.reference_image_2,
        reference_image_3: config.reference_image_3,
        reference_image_4: config.reference_image_4,
        reference_image_5: config.reference_image_5,
        reference_image_6: config.reference_image_6,
        reference_image_7: config.reference_image_7,
        reference_image_8: config.reference_image_8,
        reference_image_9: config.reference_image_9,
        reference_image_10: config.reference_image_10,
      };

      if (config.id) {
        const { error } = await supabase
          .from('carousel_generation_schedules')
          .update(configData)
          .eq('id', config.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('carousel_generation_schedules')
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
        .from('carousel_generation_schedules')
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
        .from('carousel_generation_schedules')
        .update({ last_generation_at: null })
        .eq('id', config.id);

      if (error) throw error;

      toast.success('Reset realizado! Geração habilitada para hoje.');
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
      const fileName = `${clientId}/carousels/${Date.now()}-ref-${index}.${fileExt}`;
      
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

  const handleImportReferences = (urls: string[]) => {
    const currentImages = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => 
      config[`reference_image_${i}` as keyof ScheduleConfig] as string | null
    );
    
    let urlIndex = 0;
    const newConfig = { ...config };
    
    for (let i = 1; i <= 10 && urlIndex < urls.length; i++) {
      const fieldName = `reference_image_${i}` as keyof ScheduleConfig;
      if (!currentImages[i - 1]) {
        (newConfig as any)[fieldName] = urls[urlIndex];
        urlIndex++;
      }
    }
    
    setConfig(newConfig);
    toast.success(`${urlIndex} imagem(ns) importada(s)!`);
  };

  const referenceImages = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => ({
    index: i,
    url: config[`reference_image_${i}` as keyof ScheduleConfig] as string | null,
  }));

  // Update percentages maintaining total = 100%
  const updatePercentage = (field: keyof ScheduleConfig, value: number) => {
    const fields = ['tutorial_percentage', 'comparison_percentage', 'behind_scenes_percentage', 'curated_list_percentage'] as const;
    const currentTotal = fields.reduce((sum, f) => sum + (config[f] as number), 0);
    const otherFields = fields.filter(f => f !== field);
    const otherTotal = otherFields.reduce((sum, f) => sum + (config[f] as number), 0);
    
    // Ensure value doesn't exceed 100 minus minimum for others
    const maxValue = Math.min(value, 100 - (otherFields.length * 0));
    
    setConfig(prev => ({ ...prev, [field]: maxValue }));
  };

  const totalPercentage = config.tutorial_percentage + config.comparison_percentage + 
                          config.behind_scenes_percentage + config.curated_list_percentage;

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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="geral" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="tipos" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Tipos
          </TabsTrigger>
          <TabsTrigger value="temas" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Temas
          </TabsTrigger>
          <TabsTrigger value="carrosseis" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Carrosseis
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Configuração Geral */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Geração Diária
                </CardTitle>
                <CardDescription>Configure a geração automática de carrosseis</CardDescription>
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
                  <Label>Carrosseis por dia: {config.carousels_per_day}</Label>
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={[config.carousels_per_day]}
                    onValueChange={([value]) => setConfig({ ...config, carousels_per_day: value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Slides por carrossel: {config.slides_per_carousel}</Label>
                  <Slider
                    min={7}
                    max={10}
                    step={1}
                    value={[config.slides_per_carousel]}
                    onValueChange={([value]) => setConfig({ ...config, slides_per_carousel: value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Recomendado: 8 slides (estrutura PAS completa)
                  </p>
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
                </div>
              </CardContent>
            </Card>

            {/* Estilo Visual */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Estilo Visual
                </CardTitle>
                <CardDescription>
                  Configurações visuais dos carrosseis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Dark Mode
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Recomendado para empresas tech
                    </p>
                  </div>
                  <Switch
                    checked={config.use_dark_mode}
                    onCheckedChange={(checked) => setConfig({ ...config, use_dark_mode: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Screenshots da Interface
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Incluir prints do software nos slides
                    </p>
                  </div>
                  <Switch
                    checked={config.show_ui_screenshots}
                    onCheckedChange={(checked) => setConfig({ ...config, show_ui_screenshots: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Prova Social
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Incluir slide de depoimento/resultado
                    </p>
                  </div>
                  <Switch
                    checked={config.include_proof_social}
                    onCheckedChange={(checked) => setConfig({ ...config, include_proof_social: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Bookmark className="h-4 w-4" />
                      Save-bait (Resumo)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Incluir slide de resumo para salvamentos
                    </p>
                  </div>
                  <Switch
                    checked={config.include_save_bait}
                    onCheckedChange={(checked) => setConfig({ ...config, include_save_bait: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Prompt Personalizado */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Prompt Personalizado para Imagens
              </CardTitle>
              <CardDescription>
                Instruções adicionais para a geração de imagens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Instruções personalizadas..."
                value={config.custom_image_prompt || ''}
                onChange={(e) => setConfig({ ...config, custom_image_prompt: e.target.value || null })}
                rows={4}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfig({ ...config, custom_image_prompt: SUGGESTED_PROMPT })}
              >
                <Copy className="h-4 w-4 mr-2" />
                Usar Prompt Sugerido
              </Button>
            </CardContent>
          </Card>

          {/* Imagens de Referência */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Imagens de Referência
              </CardTitle>
              <CardDescription>
                Imagens que servirão de base para o estilo visual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-3">
                {referenceImages.map(({ index, url }) => (
                  <div key={index} className="relative aspect-square">
                    {url ? (
                      <>
                        <img
                          src={url}
                          alt={`Referência ${index}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        {uploading === index ? (
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : (
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        )}
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
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
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowReferenceDialog(true)}
              >
                <Image className="h-4 w-4 mr-2" />
                Importar de Criativos
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tipos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Tipo de Carrossel</CardTitle>
              <CardDescription>
                Defina a porcentagem de cada tipo de carrossel a ser gerado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {totalPercentage !== 100 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    A soma das porcentagens deve ser 100%. Atual: {totalPercentage}%
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-blue-500" />
                      <Label>Tutorial/Hack</Label>
                    </div>
                    <span className="text-lg font-semibold">{config.tutorial_percentage}%</span>
                  </div>
                  <Slider
                    value={[config.tutorial_percentage]}
                    onValueChange={([value]) => updatePercentage('tutorial_percentage', value)}
                    min={0}
                    max={100}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ensina o usuário a resolver um problema. Foco em salvamentos.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-orange-500" />
                      <Label>Nós vs. Eles (Comparação)</Label>
                    </div>
                    <span className="text-lg font-semibold">{config.comparison_percentage}%</span>
                  </div>
                  <Slider
                    value={[config.comparison_percentage]}
                    onValueChange={([value]) => updatePercentage('comparison_percentage', value)}
                    min={0}
                    max={100}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Compara método antigo vs. novo. Foco em posicionamento.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      <Label>Bastidores / Build in Public</Label>
                    </div>
                    <span className="text-lg font-semibold">{config.behind_scenes_percentage}%</span>
                  </div>
                  <Slider
                    value={[config.behind_scenes_percentage]}
                    onValueChange={([value]) => updatePercentage('behind_scenes_percentage', value)}
                    min={0}
                    max={100}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Mostra como uma feature foi desenvolvida. Foco em conexão.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4 text-green-500" />
                      <Label>Curadoria / Listas</Label>
                    </div>
                    <span className="text-lg font-semibold">{config.curated_list_percentage}%</span>
                  </div>
                  <Slider
                    value={[config.curated_list_percentage]}
                    onValueChange={([value]) => updatePercentage('curated_list_percentage', value)}
                    min={0}
                    max={100}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Lista de ferramentas com o produto incluso. Foco em viralização.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="temas">
          <FabricaTemasPesquisa clientId={clientId} conceptPercentage={100} />
        </TabsContent>

        <TabsContent value="carrosseis">
          <FabricaCarrosseisGerados clientId={clientId} />
        </TabsContent>

        <TabsContent value="historico">
          <FabricaCarrosseisHistorico clientId={clientId} />
        </TabsContent>
      </Tabs>

      <ReferenceSelectionDialog
        open={showReferenceDialog}
        onOpenChange={setShowReferenceDialog}
        clientId={clientId}
        companyId={activeCompany?.company_id || ""}
        onSelect={handleImportReferences}
      />
    </div>
  );
}
