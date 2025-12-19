import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronLeft, ChevronRight, TrendingUp, DollarSign, Users, MousePointer, Target, BarChart3, Sparkles, CheckCircle, ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CampaignData {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpa: number;
}

interface AdData {
  id: string;
  name: string;
  campaign_name: string;
  image_url: string | null;
  video_url: string | null;
  creative_type: string | null;
  creative_body: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
}

interface CampaignAnalysis {
  campaign_id: string;
  campaign_name: string;
  highlights: string[];
  opportunities: string[];
}

interface Presentation {
  id: string;
  name: string;
  period_start: string;
  period_end: string;
  primary_color: string;
  secondary_color: string;
  executive_summary: string | null;
  action_plan: string | null;
  campaign_analyses: CampaignAnalysis[];
  metrics_snapshot: {
    total_spend: number;
    total_impressions: number;
    total_clicks: number;
    total_conversions: number;
    avg_ctr: number;
    avg_cpc: number;
    avg_cpa: number;
    campaigns: CampaignData[];
    top_ads: AdData[];
  } | null;
  client: {
    name: string;
    company: string;
    avatar: string | null;
    presentation_logo: string | null;
  };
}

export default function ApresentacaoResultadosPublica() {
  const { token } = useParams<{ token: string }>();
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    async function fetchPresentation() {
      if (!token) {
        setError("Token não fornecido");
        setLoading(false);
        return;
      }

      try {
        // Fetch presentation by public token
        const { data: presentationData, error: presentationError } = await supabase
          .from("campaign_presentations")
          .select(`
            id,
            name,
            period_start,
            period_end,
            primary_color,
            secondary_color,
            executive_summary,
            action_plan,
            campaign_analyses,
            metrics_snapshot,
            clients!campaign_presentations_client_id_fkey (
              name,
              company,
              avatar,
              presentation_logo
            )
          `)
          .eq("public_token", token)
          .eq("status", "published")
          .single();

        if (presentationError || !presentationData) {
          setError("Apresentação não encontrada ou não publicada");
          setLoading(false);
          return;
        }

        const client = presentationData.clients as any;

        setPresentation({
          ...presentationData,
          campaign_analyses: (presentationData.campaign_analyses || []) as unknown as CampaignAnalysis[],
          metrics_snapshot: presentationData.metrics_snapshot as unknown as Presentation['metrics_snapshot'],
          client: {
            name: client?.name || "",
            company: client?.company || "",
            avatar: client?.avatar || null,
            presentation_logo: client?.presentation_logo || null,
          },
        });

        // Increment view count
        await supabase
          .from("campaign_presentations")
          .update({ view_count: (presentationData as any).view_count + 1 })
          .eq("id", presentationData.id);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPresentation();
  }, [token]);

  // Calculate total slides
  const metrics = presentation?.metrics_snapshot;
  const campaigns = metrics?.campaigns || [];
  const topAds = metrics?.top_ads || [];
  const analyses = presentation?.campaign_analyses || [];

  // Slides: Cover (1) + KPIs (1) + Campaigns Overview (1) + Campaign Details (campaigns.length) + Top Creatives (ceil(topAds/2)) + Action Plan (1)
  const creativeSlides = Math.ceil(topAds.length / 2);
  const totalSlides = presentation ? 1 + 1 + 1 + Math.min(campaigns.length, 5) + creativeSlides + 1 : 0;

  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < totalSlides) {
      setCurrentSlide(index);
    }
  }, [totalSlides]);

  const nextSlide = useCallback(() => goToSlide(currentSlide + 1), [currentSlide, goToSlide]);
  const prevSlide = useCallback(() => goToSlide(currentSlide - 1), [currentSlide, goToSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevSlide();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !presentation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">
            {error || "Apresentação não encontrada"}
          </p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  // Render functions for each slide type
  const renderCoverSlide = () => (
    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-primary/10 via-background to-primary/5">
      <div className="mb-8">
        {presentation.client.presentation_logo || presentation.client.avatar ? (
          <img
            src={presentation.client.presentation_logo || presentation.client.avatar!}
            alt={presentation.client.name}
            className="w-32 h-32 object-contain mx-auto"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-primary flex items-center justify-center mx-auto">
            <span className="text-4xl font-bold text-primary-foreground">
              {presentation.client.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
        Relatório de Performance
      </h1>
      <p className="text-xl text-muted-foreground mb-2">
        {presentation.client.name}
      </p>
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>
          {format(new Date(presentation.period_start), "dd 'de' MMMM", { locale: ptBR })} - {format(new Date(presentation.period_end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </span>
      </div>
      <div className="mt-12 animate-bounce">
        <ChevronRight className="w-8 h-8 text-primary" />
      </div>
    </div>
  );

  const renderKPIsSlide = () => (
    <div className="h-full flex flex-col p-8">
      <h2 className="text-3xl font-bold mb-8 text-center">Visão Geral de Performance</h2>
      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6 content-center">
        <KPICard
          icon={<DollarSign className="w-8 h-8" />}
          label="Total Investido"
          value={formatCurrency(metrics?.total_spend || 0)}
          color="text-green-500"
        />
        <KPICard
          icon={<Users className="w-8 h-8" />}
          label="Pessoas Alcançadas"
          value={formatNumber(metrics?.total_impressions || 0)}
          color="text-blue-500"
        />
        <KPICard
          icon={<MousePointer className="w-8 h-8" />}
          label="Cliques"
          value={formatNumber(metrics?.total_clicks || 0)}
          color="text-purple-500"
        />
        <KPICard
          icon={<Target className="w-8 h-8" />}
          label="Conversões"
          value={formatNumber(metrics?.total_conversions || 0)}
          color="text-orange-500"
        />
        <KPICard
          icon={<TrendingUp className="w-8 h-8" />}
          label="CTR Médio"
          value={formatPercent(metrics?.avg_ctr || 0)}
          color="text-cyan-500"
        />
        <KPICard
          icon={<BarChart3 className="w-8 h-8" />}
          label="CPC Médio"
          value={formatCurrency(metrics?.avg_cpc || 0)}
          color="text-indigo-500"
        />
        <KPICard
          icon={<Target className="w-8 h-8" />}
          label="Custo por Conversão"
          value={formatCurrency(metrics?.avg_cpa || 0)}
          color="text-pink-500"
        />
        <KPICard
          icon={<Sparkles className="w-8 h-8" />}
          label="Campanhas Ativas"
          value={campaigns.filter(c => c.status === 'ACTIVE').length.toString()}
          color="text-yellow-500"
        />
      </div>
    </div>
  );

  const renderCampaignsOverviewSlide = () => (
    <div className="h-full flex flex-col p-8">
      <h2 className="text-3xl font-bold mb-6 text-center">Campanhas do Período</h2>
      <div className="flex-1 overflow-auto">
        <div className="space-y-4">
          {campaigns.slice(0, 6).map((campaign, index) => (
            <div
              key={campaign.id}
              className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                  campaign.status === 'ACTIVE' ? "bg-green-500/20 text-green-500" : "bg-muted-foreground/20 text-muted-foreground"
                )}>
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium truncate max-w-[300px]">{campaign.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {campaign.conversions} conversões • CTR: {formatPercent(campaign.ctr)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{formatCurrency(campaign.spend)}</p>
                <p className="text-sm text-muted-foreground">
                  CPA: {formatCurrency(campaign.cpa)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCampaignDetailSlide = (campaignIndex: number) => {
    const campaign = campaigns[campaignIndex];
    const analysis = analyses.find(a => a.campaign_id === campaign?.id);
    
    if (!campaign) return null;

    return (
      <div className="h-full flex flex-col p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            campaign.status === 'ACTIVE' ? "bg-green-500" : "bg-muted-foreground"
          )}>
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{campaign.name}</h2>
            <p className="text-muted-foreground">
              {campaign.status === 'ACTIVE' ? 'Campanha Ativa' : 'Campanha Pausada'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">{formatCurrency(campaign.spend)}</p>
            <p className="text-sm text-muted-foreground">Investido</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">{campaign.conversions}</p>
            <p className="text-sm text-muted-foreground">Conversões</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">{formatPercent(campaign.ctr)}</p>
            <p className="text-sm text-muted-foreground">CTR</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">{formatCurrency(campaign.cpa)}</p>
            <p className="text-sm text-muted-foreground">Custo/Conversão</p>
          </div>
        </div>

        {analysis && (
          <div className="grid md:grid-cols-2 gap-6 flex-1">
            <div className="bg-green-500/10 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-green-600">O que está funcionando</h3>
              </div>
              <ul className="space-y-2">
                {analysis.highlights.map((highlight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-green-500 mt-1">•</span>
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <ArrowRight className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-blue-600">Oportunidades de melhoria</h3>
              </div>
              <ul className="space-y-2">
                {analysis.opportunities.map((opportunity, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-blue-500 mt-1">•</span>
                    {opportunity}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCreativeSlide = (creativeIndex: number) => {
    const startIndex = creativeIndex * 2;
    const adsToShow = topAds.slice(startIndex, startIndex + 2);

    return (
      <div className="h-full flex flex-col p-8">
        <h2 className="text-3xl font-bold mb-6 text-center">Criativos em Destaque</h2>
        <div className="flex-1 grid md:grid-cols-2 gap-8 content-center">
          {adsToShow.map((ad) => (
            <div key={ad.id} className="flex flex-col">
              {/* Feed Preview */}
              <div className="max-w-[280px] mx-auto bg-white dark:bg-zinc-900 rounded-lg border shadow-sm overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-2 p-3 border-b">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-[2px]">
                    <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
                      {presentation.client.avatar ? (
                        <img src={presentation.client.avatar} alt={presentation.client.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold">
                          {presentation.client.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{presentation.client.name}</p>
                    <p className="text-[10px] text-muted-foreground">Patrocinado</p>
                  </div>
                </div>

                {/* Media */}
                <div className="aspect-square bg-muted relative">
                  {ad.video_url ? (
                    <div className="relative w-full h-full">
                      <video
                        src={ad.video_url}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        playsInline
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Play className="w-12 h-12 text-white" />
                      </div>
                    </div>
                  ) : ad.image_url ? (
                    <img src={ad.image_url} alt={ad.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-sm text-muted-foreground">Sem imagem</span>
                    </div>
                  )}
                </div>

                {/* Caption */}
                {ad.creative_body && (
                  <div className="p-3">
                    <p className="text-xs line-clamp-2">{ad.creative_body}</p>
                  </div>
                )}
              </div>

              {/* Metrics */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/50 rounded p-2">
                  <p className="font-bold text-sm">{formatNumber(ad.clicks)}</p>
                  <p className="text-xs text-muted-foreground">Cliques</p>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <p className="font-bold text-sm">{formatPercent(ad.ctr)}</p>
                  <p className="text-xs text-muted-foreground">CTR</p>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <p className="font-bold text-sm">{ad.conversions}</p>
                  <p className="text-xs text-muted-foreground">Conv.</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderActionPlanSlide = () => (
    <div className="h-full flex flex-col p-8">
      <h2 className="text-3xl font-bold mb-8 text-center">Próximos Passos</h2>
      <div className="flex-1 grid md:grid-cols-2 gap-8 content-center">
        {presentation.executive_summary && (
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-semibold">Resumo Executivo</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {presentation.executive_summary}
            </p>
          </div>
        )}

        {presentation.action_plan && (
          <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-6 h-6 text-green-500" />
              <h3 className="text-xl font-semibold">Plano de Ação</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {presentation.action_plan}
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 text-center">
        <p className="text-muted-foreground">
          Obrigado pela confiança! Estamos comprometidos com o sucesso das suas campanhas.
        </p>
      </div>
    </div>
  );

  // Determine which slide to render
  const renderCurrentSlide = () => {
    if (currentSlide === 0) return renderCoverSlide();
    if (currentSlide === 1) return renderKPIsSlide();
    if (currentSlide === 2) return renderCampaignsOverviewSlide();
    
    const campaignDetailStart = 3;
    const numCampaignSlides = Math.min(campaigns.length, 5);
    
    if (currentSlide < campaignDetailStart + numCampaignSlides) {
      return renderCampaignDetailSlide(currentSlide - campaignDetailStart);
    }

    const creativeSlideStart = campaignDetailStart + numCampaignSlides;
    if (currentSlide < creativeSlideStart + creativeSlides) {
      return renderCreativeSlide(currentSlide - creativeSlideStart);
    }

    return renderActionPlanSlide();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main content */}
      <div className="flex-1 relative overflow-hidden">
        {renderCurrentSlide()}
      </div>

      {/* Navigation */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-background/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevSlide}
          disabled={currentSlide === 0}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                currentSlide === index
                  ? "bg-primary w-6"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={nextSlide}
          disabled={currentSlide === totalSlides - 1}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

// KPI Card component
function KPICard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-muted/50 rounded-xl p-6 text-center hover:bg-muted/70 transition-colors">
      <div className={cn("mx-auto mb-3", color)}>{icon}</div>
      <p className="text-2xl md:text-3xl font-bold mb-1">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
