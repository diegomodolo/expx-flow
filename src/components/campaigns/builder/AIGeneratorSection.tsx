import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  Brain,
  Image as ImageIcon,
  Target,
  Users,
  FileText,
  ChevronDown,
  Pencil,
  Palette
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMetaPixels } from '@/hooks/useMetaPixels';
import { useMetaAudiences } from '@/hooks/useMetaAudiences';

interface AIGeneratorSectionProps {
  clientId: string;
  companyId: string;
  onGenerated: (data: AIGeneratedData) => void;
  onNavigateToSection: (section: 'campaign' | 'adsets' | 'review') => void;
}

export interface AIGeneratedData {
  campaign: {
    name: string;
    objective: string;
    budgetType: 'daily' | 'lifetime';
    budgetValue: number;
    status: 'ACTIVE' | 'PAUSED';
  };
  adSets: Array<{
    id: string;
    name: string;
    includedAudiences: string[];
    excludedAudiences: string[];
    ageMin: number;
    ageMax: number;
    genders: number[];
    pixelId?: string;
    conversionEvent?: string;
    creatives: Array<{
      id: string;
      type: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
      mediaUrls: string[];
      body: string;
      title: string;
      description: string;
      linkUrl: string;
      callToAction: string;
      urlParameters: {
        utm_source?: string;
        utm_medium?: string;
        utm_campaign?: string;
      };
    }>;
  }>;
}

interface ClientData {
  ai_briefing: string | null;
  monthly_budget: number | null;
  website_url: string | null;
  product_name: string | null;
  target_audience: string | null;
  sector: string | null;
}

interface CampaignSpend {
  totalSpend: number;
}

type GenerationStep = 'idle' | 'fetching' | 'analyzing' | 'generating' | 'image' | 'done' | 'error';

const OBJECTIVE_OPTIONS = [
  { value: 'auto', label: 'Deixar a IA decidir', description: 'A IA escolhe o melhor objetivo' },
  { value: 'OUTCOME_SALES', label: 'Vendas', description: 'Conversões e compras' },
  { value: 'OUTCOME_LEADS', label: 'Leads', description: 'Geração de leads' },
  { value: 'OUTCOME_TRAFFIC', label: 'Tráfego', description: 'Visitas ao site' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engajamento', description: 'Interações com conteúdo' },
  { value: 'OUTCOME_AWARENESS', label: 'Reconhecimento', description: 'Alcance da marca' },
];

const STEP_MESSAGES: Record<GenerationStep, string> = {
  idle: '',
  fetching: 'Buscando dados do cliente...',
  analyzing: 'Analisando briefing e estratégias...',
  generating: 'Gerando campanha otimizada...',
  image: 'Criando imagens dos criativos...',
  done: 'Campanha gerada com sucesso!',
  error: 'Erro na geração',
};

const STEP_PROGRESS: Record<GenerationStep, number> = {
  idle: 0,
  fetching: 15,
  analyzing: 35,
  generating: 60,
  image: 85,
  done: 100,
  error: 0,
};

export function AIGeneratorSection({
  clientId,
  companyId,
  onGenerated,
  onNavigateToSection,
}: AIGeneratorSectionProps) {
  const { toast } = useToast();
  const { pixels, fetchPixels } = useMetaPixels(clientId, companyId);
  const { audiences, fetchAudiences } = useMetaAudiences(clientId);
  
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [currentSpend, setCurrentSpend] = useState<number>(0);
  const [selectedObjective, setSelectedObjective] = useState('auto');
  const [generateImage, setGenerateImage] = useState(true);
  const [creativesCount, setCreativesCount] = useState<number>(1);
  const [step, setStep] = useState<GenerationStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Custom prompts for AI generation
  const [useCustomPrompts, setUseCustomPrompts] = useState(false);
  const [copyPrompt, setCopyPrompt] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [customPromptsOpen, setCustomPromptsOpen] = useState(false);

  // Fetch client data and resources on mount
  useEffect(() => {
    async function fetchClientData() {
      const { data, error } = await supabase
        .from('clients')
        .select('ai_briefing, monthly_budget, website_url, product_name, target_audience, sector')
        .eq('id', clientId)
        .single();

      if (!error && data) {
        setClientData(data);
      }
    }
    
    async function fetchCurrentSpend() {
      // Get total spend from active campaigns for this client
      const { data, error } = await supabase
        .from('campaigns')
        .select('daily_budget')
        .eq('client_id', clientId)
        .eq('is_active', true);

      if (!error && data) {
        // Calculate monthly spend from daily budgets (daily * 30)
        const totalMonthlySpend = data.reduce((sum, campaign) => {
          return sum + ((campaign.daily_budget || 0) * 30);
        }, 0);
        setCurrentSpend(totalMonthlySpend);
      }
    }
    
    fetchClientData();
    fetchCurrentSpend();
    fetchPixels();
    fetchAudiences();
  }, [clientId, fetchPixels, fetchAudiences]);

  const hasBriefing = !!clientData?.ai_briefing;
  const monthlyBudget = clientData?.monthly_budget || 0;
  
  // Calculate available budget (monthly budget - current spend from active campaigns)
  const availableBudget = Math.max(0, monthlyBudget - currentSpend);

  const handleGenerate = async () => {
    if (!hasBriefing) {
      toast({
        title: 'Briefing não disponível',
        description: 'Gere o briefing do cliente antes de usar a geração com IA.',
        variant: 'destructive',
      });
      return;
    }

    setStep('fetching');
    setErrorMessage(null);

    try {
      setStep('analyzing');

      // Prepare audiences data - MetaAudience has 'id' which is the Facebook ID
      const availableAudiences = audiences?.map(a => ({
        id: a.id,
        name: a.name,
        type: a.subtype,
      })) || [];

      // Prepare pixels data - MetaPixel has 'pixel_id' and 'pixel_name'
      const availablePixels = pixels?.map(p => ({
        id: p.pixel_id,
        name: p.pixel_name,
      })) || [];

      setStep('generating');

      // Call the AI generation edge function with AVAILABLE budget (not total monthly)
      const { data: aiData, error: aiError } = await supabase.functions.invoke('generate-ai-campaign', {
        body: {
          clientId,
          companyId,
          briefing: clientData?.ai_briefing,
          monthlyBudget: availableBudget, // Use available budget, not total
          currentSpend,
          totalMonthlyBudget: monthlyBudget,
          websiteUrl: clientData?.website_url,
          productName: clientData?.product_name,
          targetAudience: clientData?.target_audience,
          sector: clientData?.sector,
          preferredObjective: selectedObjective !== 'auto' ? selectedObjective : undefined,
          creativesCount,
          availableAudiences,
          availablePixels,
          // Custom prompts
          customCopyPrompt: useCustomPrompts && copyPrompt.trim() ? copyPrompt.trim() : undefined,
          customImagePrompt: useCustomPrompts && imagePrompt.trim() ? imagePrompt.trim() : undefined,
        },
      });

      if (aiError) throw aiError;
      if (!aiData.success) throw new Error(aiData.error || 'Erro ao gerar campanha');

      let generatedData: AIGeneratedData = aiData.data;

      // Generate images for ALL creatives if requested
      if (generateImage && generatedData.adSets[0]?.creatives?.length > 0) {
        setStep('image');

        const allCreatives = generatedData.adSets[0].creatives;
        const imagePromises = allCreatives.map(async (creative, index) => {
          try {
            // Build prompt for image generation
            // Priority: custom image prompt > AI generated prompt > default
            let creativePrompt = '';
            
            if (useCustomPrompts && imagePrompt.trim()) {
              // User provided custom image prompt
              creativePrompt = `${imagePrompt.trim()}. Variação ${index + 1} para o criativo: "${creative.title || creative.body?.substring(0, 50) || 'produto'}"`;
            } else {
              // Use AI-generated prompt or default
              creativePrompt = `${aiData.imagePrompt || `Imagem de anúncio para ${clientData?.product_name || 'produto'}`}. Variação ${index + 1}: foco em "${creative.title || creative.body?.substring(0, 50) || 'produto'}"`;
            }
            
            const { data: imageData, error: imageError } = await supabase.functions.invoke('generate-ai-campaign-image', {
              body: {
                clientId,
                prompt: creativePrompt,
                productName: clientData?.product_name,
                sector: clientData?.sector,
              },
            });

            if (!imageError && imageData?.success && imageData?.imageUrl) {
              return { index, imageUrl: imageData.imageUrl };
            }
            return { index, imageUrl: null };
          } catch (err) {
            console.error(`Error generating image for creative ${index}:`, err);
            return { index, imageUrl: null };
          }
        });

        // Wait for all images to be generated
        const imageResults = await Promise.all(imagePromises);

        // Apply all images to their respective creatives
        generatedData = {
          ...generatedData,
          adSets: generatedData.adSets.map((adSet, adSetIndex) => 
            adSetIndex === 0 
              ? {
                  ...adSet,
                  creatives: adSet.creatives.map((creative, cIndex) => {
                    const result = imageResults.find(r => r.index === cIndex);
                    return result?.imageUrl 
                      ? { ...creative, mediaUrls: [result.imageUrl] }
                      : creative;
                  }),
                }
              : adSet
          ),
        };
      }

      setStep('done');

      // Apply the generated data
      onGenerated(generatedData);

      toast({
        title: 'Campanha gerada!',
        description: 'A IA criou uma campanha completa. Revise e ajuste conforme necessário.',
      });

      // Navigate to campaign section after a short delay
      setTimeout(() => {
        onNavigateToSection('campaign');
      }, 1500);

    } catch (err: any) {
      console.error('AI generation error:', err);
      setStep('error');
      setErrorMessage(err.message || 'Erro desconhecido');
      toast({
        title: 'Erro na geração',
        description: err.message || 'Não foi possível gerar a campanha.',
        variant: 'destructive',
      });
    }
  };

  const isGenerating = ['fetching', 'analyzing', 'generating', 'image'].includes(step);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Geração Inteligente de Campanha
        </h2>
        <p className="text-muted-foreground mt-1">
          A IA vai analisar o briefing do cliente e gerar automaticamente uma campanha otimizada.
        </p>
      </div>

      {/* Briefing Status */}
      {!hasBriefing ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            O cliente não possui briefing gerado. Por favor, gere o briefing primeiro para usar esta funcionalidade.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-primary/20 bg-primary/5">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <AlertDescription className="text-foreground">
            Briefing disponível e pronto para análise.
          </AlertDescription>
        </Alert>
      )}

      {/* Objective Selection */}
      <div className="space-y-3">
        <Label className="text-base">Objetivo Principal (opcional)</Label>
        <RadioGroup
          value={selectedObjective}
          onValueChange={setSelectedObjective}
          disabled={isGenerating}
          className="grid gap-2"
        >
          {OBJECTIVE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedObjective === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/50'
              } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <RadioGroupItem value={option.value} />
              <div className="flex-1">
                <p className="font-medium text-sm">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Custom Prompts Section */}
      <Collapsible
        open={customPromptsOpen}
        onOpenChange={setCustomPromptsOpen}
        className="border rounded-lg"
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="useCustomPrompts"
                  checked={useCustomPrompts}
                  onCheckedChange={(checked) => {
                    setUseCustomPrompts(!!checked);
                    if (checked) setCustomPromptsOpen(true);
                  }}
                  disabled={isGenerating}
                  onClick={(e) => e.stopPropagation()}
                />
                <Label htmlFor="useCustomPrompts" className="font-medium cursor-pointer" onClick={(e) => e.stopPropagation()}>
                  Usar instruções personalizadas
                </Label>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${customPromptsOpen ? 'rotate-180' : ''}`} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t pt-4">
            <p className="text-xs text-muted-foreground">
              Forneça instruções específicas para guiar a IA. O briefing do cliente será sempre considerado como contexto base.
            </p>
            
            {/* Copy/Text Prompt */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Pencil className="h-4 w-4" />
                Orientações para Textos (Copy)
              </Label>
              <Textarea
                placeholder="Ex: Foco em urgência e escassez. Usar linguagem informal e direta. Destacar desconto de 30%..."
                value={copyPrompt}
                onChange={(e) => setCopyPrompt(e.target.value)}
                disabled={isGenerating || !useCustomPrompts}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Descreva o tom, estilo e elementos que deseja nos títulos e textos dos anúncios.
              </p>
            </div>

            {/* Image Prompt */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Palette className="h-4 w-4" />
                Orientações para Imagens
              </Label>
              <Textarea
                placeholder="Ex: Mostrar uma pessoa usando o produto. Incluir texto promocional na imagem. Cores vibrantes..."
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                disabled={isGenerating || !useCustomPrompts || !generateImage}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Descreva como você quer que as imagens dos criativos sejam. As imagens de referência do cliente serão usadas como base visual.
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Generate Image Option */}
      <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
        <Checkbox
          id="generateImage"
          checked={generateImage}
          onCheckedChange={(checked) => setGenerateImage(!!checked)}
          disabled={isGenerating}
        />
        <div className="space-y-1">
          <Label htmlFor="generateImage" className="font-medium cursor-pointer">
            Gerar imagem para o criativo
          </Label>
          <p className="text-xs text-muted-foreground">
            Cria uma imagem única usando IA baseada no produto/serviço do cliente
          </p>
        </div>
      </div>

      {/* Creatives Count */}
      <div className="space-y-3">
        <Label className="text-base">Quantidade de Criativos</Label>
        <p className="text-xs text-muted-foreground">
          Quantos criativos diferentes a IA deve gerar para esta campanha?
        </p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={30}
            value={creativesCount}
            onChange={(e) => setCreativesCount(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
            disabled={isGenerating}
            className={`w-20 h-12 text-center rounded-lg border font-bold text-lg ${
              isGenerating ? 'opacity-50 cursor-not-allowed bg-muted' : 'bg-background'
            }`}
          />
          <span className="text-sm text-muted-foreground">
            (máximo 30)
          </span>
        </div>
        {creativesCount > 5 && generateImage && (
          <p className="text-xs text-amber-600">
            ⚠️ Gerar imagens para {creativesCount} criativos pode demorar alguns minutos
          </p>
        )}
      </div>

      {/* Data Summary */}
      <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
        <p className="font-medium text-sm flex items-center gap-2">
          <Brain className="h-4 w-4" />
          Dados que serão usados:
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>Briefing:</span>
            <span className={hasBriefing ? 'text-green-600' : 'text-destructive'}>
              {hasBriefing ? '✓ Disponível' : '✗ Não disponível'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span>Orçamento total:</span>
            <span className="font-medium">
              {monthlyBudget > 0 ? `R$ ${monthlyBudget.toLocaleString('pt-BR')}` : 'Não definido'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span>Já comprometido:</span>
            <span className="font-medium text-amber-600">
              R$ {currentSpend.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span>Disponível:</span>
            <span className={`font-medium ${availableBudget > 0 ? 'text-green-600' : 'text-destructive'}`}>
              R$ {availableBudget.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>Públicos:</span>
            <span>{audiences?.length || 0} disponíveis</span>
          </div>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <span>Pixels:</span>
            <span className={pixels?.length ? 'text-green-600' : 'text-muted-foreground'}>
              {pixels?.length ? '✓ Configurado' : 'Nenhum'}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {isGenerating && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{STEP_MESSAGES[step]}</span>
            <span className="font-medium">{STEP_PROGRESS[step]}%</span>
          </div>
          <Progress value={STEP_PROGRESS[step]} className="h-2" />
        </div>
      )}

      {/* Success Message */}
      {step === 'done' && (
        <Alert className="border-green-500/20 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Campanha gerada com sucesso! Redirecionando para revisão...
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {step === 'error' && errorMessage && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Generate Button */}
      <Button
        size="lg"
        className="w-full"
        onClick={handleGenerate}
        disabled={!hasBriefing || isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Gerando campanha...
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5 mr-2" />
            Gerar Campanha Completa
          </>
        )}
      </Button>

      {/* Warning */}
      <p className="text-xs text-muted-foreground text-center">
        ⚠️ Você poderá revisar e ajustar tudo antes de publicar
      </p>
    </div>
  );
}
