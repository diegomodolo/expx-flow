import { useParams } from "react-router-dom";
import { useClientDashboard } from "@/hooks/useClientDashboard";
import { MetricsCards } from "@/components/dashboard-public/MetricsCards";
import { FunnelVisualization } from "@/components/dashboard-public/FunnelVisualization";
import { PerformanceMetrics } from "@/components/dashboard-public/PerformanceMetrics";
import { TimelineChart } from "@/components/dashboard-public/TimelineChart";
import { TopCampaignsPie } from "@/components/dashboard-public/TopCampaignsPie";
import { CampaignsTable } from "@/components/dashboard-public/CampaignsTable";
import { PeriodSelector } from "@/components/dashboard-public/PeriodSelector";
import { SocialMetricsCard } from "@/components/dashboard-public/SocialMetricsCard";
import { TopEngagementPostsCard } from "@/components/dashboard-public/TopEngagementPostsCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, Maximize, Minimize, Sun, Moon, Monitor } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTheme } from "next-themes";

const ClientDashboardPublic = () => {
  const { token } = useParams<{ token: string }>();
  const { theme, setTheme } = useTheme();
  const [period, setPeriod] = useState(30);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000), // 30 dias = hoje + 29 anteriores
    to: new Date()
  });
  const [metaPreset, setMetaPreset] = useState<string | null>('last_30d'); // Preset inicial
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState("5");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [nextRefresh, setNextRefresh] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [kioskMode, setKioskMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  const startDate = format(dateRange.from, 'yyyy-MM-dd');
  const endDate = format(dateRange.to, 'yyyy-MM-dd');
  
  // Passar o preset para usar date_preset do Meta (alinha com sync-facebook-campaigns)
  const { data, isLoading, error, refetch } = useClientDashboard(token || "", startDate, endDate, metaPreset || undefined);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!kioskMode) {
      setShowControls(true);
      return;
    }

    let inactivityTimer: NodeJS.Timeout;

    const resetTimer = () => {
      setShowControls(true);
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    };

    const handleActivity = () => {
      resetTimer();
    };

    resetTimer();

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);

    return () => {
      clearTimeout(inactivityTimer);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [kioskMode]);

  const handleDateRangeChange = (range: { from: Date; to: Date }, preset?: string | null) => {
    setDateRange(range);
    setMetaPreset(preset ?? null);
    const days = Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24));
    setPeriod(days);
  };

  const handleManualRefresh = useCallback(async () => {
    toast.info("Atualizando dados...");
    await refetch();
    setLastRefresh(new Date());
    if (autoRefresh) {
      setNextRefresh(new Date(Date.now() + parseInt(refreshInterval) * 60 * 1000));
    }
    toast.success("Dados atualizados!");
  }, [refetch, autoRefresh, refreshInterval]);

  useEffect(() => {
    if (!autoRefresh) {
      setNextRefresh(null);
      return;
    }
    const intervalMs = parseInt(refreshInterval) * 60 * 1000;
    setNextRefresh(new Date(Date.now() + intervalMs));
    const interval = setInterval(async () => {
      await refetch();
      setLastRefresh(new Date());
      setNextRefresh(new Date(Date.now() + intervalMs));
      toast.success("Dados atualizados automaticamente");
    }, intervalMs);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refetch]);

  useEffect(() => {
    if (!autoRefresh || !nextRefresh) return;
    const timer = setInterval(() => {
      setNextRefresh(new Date(Date.now() + parseInt(refreshInterval) * 60 * 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [autoRefresh, refreshInterval, nextRefresh]);

  const getTimeUntilRefresh = () => {
    if (!nextRefresh || !autoRefresh) return null;
    const diff = Math.max(0, nextRefresh.getTime() - Date.now());
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor(diff % 60000 / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        toast.success("Modo tela cheia ativado");
      } else {
        await document.exitFullscreen();
        toast.info("Modo tela cheia desativado");
      }
    } catch (error) {
      console.error("Erro ao alternar fullscreen:", error);
      toast.error("Não foi possível alterar o modo tela cheia");
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    toast.success(`Tema ${newTheme === "dark" ? "escuro" : "claro"} ativado`);
  };

  const toggleKioskMode = () => {
    const newKioskMode = !kioskMode;
    setKioskMode(newKioskMode);
    if (newKioskMode) {
      toast.success("Modo Kiosk ativado - controles ocultarão após 5s de inatividade");
    } else {
      toast.info("Modo Kiosk desativado");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
          <p className="text-body-md text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive text-title-lg">Erro ao carregar dashboard</p>
          <p className="text-body-md text-muted-foreground">Token inválido ou expirado</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const hasTopPosts = data.social_metrics?.instagram?.top_posts && data.social_metrics.instagram.top_posts.length > 0;

  return (
    <div className="h-screen w-screen bg-background overflow-hidden flex flex-col">
      {/* Header */}
      <div 
        className={cn(
          "border-b border-border bg-card shadow-google-sm flex-shrink-0 transition-all duration-500 ease-in-out",
          kioskMode && !showControls && "opacity-0 -translate-y-full pointer-events-none"
        )}
      >
        <div className="px-6 py-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-headline-md text-foreground">Relatório de Tráfego</h1>
                <p className="text-body-sm text-muted-foreground">
                  {data.client.company} - {data.client.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={kioskMode ? "default" : "ghost"}
                size="sm"
                onClick={toggleKioskMode}
                title={kioskMode ? "Desativar modo Kiosk" : "Ativar modo Kiosk"}
                className="rounded-full"
              >
                <Monitor className="h-4 w-4" />
              </Button>

              {mounted && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={toggleTheme} 
                  title={theme === "dark" ? "Tema claro" : "Tema escuro"}
                  className="rounded-full"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              )}

              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleFullscreen} 
                title={isFullscreen ? "Sair tela cheia" : "Tela cheia"}
                className="rounded-full"
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>

              <div className="flex items-center gap-2 border-l border-border pl-3 ml-1">
                <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
                <Label htmlFor="auto-refresh" className="text-body-sm cursor-pointer">
                  Auto
                </Label>
                {autoRefresh && (
                  <>
                    <Select value={refreshInterval} onValueChange={setRefreshInterval}>
                      <SelectTrigger className="w-20 h-7 text-body-sm rounded-full border-0 bg-secondary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 min</SelectItem>
                        <SelectItem value="5">5 min</SelectItem>
                        <SelectItem value="10">10 min</SelectItem>
                        <SelectItem value="15">15 min</SelectItem>
                        <SelectItem value="30">30 min</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-label-sm text-muted-foreground">
                      {getTimeUntilRefresh()}
                    </span>
                  </>
                )}
              </div>

              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleManualRefresh} 
                disabled={isLoading}
                className="rounded-full"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-body-sm font-medium text-foreground">Período:</span>
              <PeriodSelector dateRange={dateRange} onDateRangeChange={handleDateRangeChange} />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4 space-y-3">
        <MetricsCards metrics={data.metrics} />

        {data.social_metrics && (data.social_metrics.instagram || data.social_metrics.facebook) && (
          <SocialMetricsCard socialMetrics={data.social_metrics} />
        )}

        <div className={`grid grid-cols-1 gap-3 ${hasTopPosts ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
          <FunnelVisualization metrics={data.metrics} />
          <PerformanceMetrics metrics={data.metrics} />
          {hasTopPosts && (
            <TopEngagementPostsCard posts={data.social_metrics!.instagram!.top_posts!} />
          )}
        </div>

        <TimelineChart data={data.timeline} />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <TopCampaignsPie campaigns={data.top_campaigns} />
          </div>
          <div className="lg:col-span-3">
            <CampaignsTable campaigns={data.campaigns_table} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboardPublic;
