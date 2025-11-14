import { useParams } from "react-router-dom";
import { useClientDashboard } from "@/hooks/useClientDashboard";
import { MetricsCards } from "@/components/dashboard-public/MetricsCards";
import { FunnelVisualization } from "@/components/dashboard-public/FunnelVisualization";
import { PerformanceMetrics } from "@/components/dashboard-public/PerformanceMetrics";
import { TimelineChart } from "@/components/dashboard-public/TimelineChart";
import { TopCampaignsPie } from "@/components/dashboard-public/TopCampaignsPie";
import { CampaignsTable } from "@/components/dashboard-public/CampaignsTable";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Loader2, RefreshCw, Maximize, Minimize, Sun, Moon, Monitor } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTheme } from "next-themes";
const ClientDashboardPublic = () => {
  const {
    token
  } = useParams<{
    token: string;
  }>();
  const {
    theme,
    setTheme
  } = useTheme();
  const [period, setPeriod] = useState(30);
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date()
  });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState("5");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [nextRefresh, setNextRefresh] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [kioskMode, setKioskMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const {
    data,
    isLoading,
    error,
    refetch
  } = useClientDashboard(token || "", period);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Kiosk mode: hide controls after 5 seconds of inactivity
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

    // Initial timer
    resetTimer();

    // Listen for mouse movement and clicks
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
  const handleDateSelect = (range: {
    from: Date;
    to: Date;
  } | undefined) => {
    if (range?.from && range?.to) {
      setDateRange(range);
      const days = Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24));
      setPeriod(days);
    }
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

  // Auto-refresh effect
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

  // Update next refresh time every second
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

  // Fullscreen functionality
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

  // Listen to fullscreen changes
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
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>;
  }
  if (error) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive text-lg font-semibold">Erro ao carregar dashboard</p>
          <p className="text-muted-foreground">Token inválido ou expirado</p>
        </div>
      </div>;
  }
  if (!data) {
    return null;
  }
  return <div className="h-screen w-screen bg-background overflow-hidden flex flex-col">
      {/* Header */}
      <div 
        className={cn(
          "border-b border-border bg-card flex-shrink-0 transition-all duration-500 ease-in-out",
          kioskMode && !showControls && "opacity-0 -translate-y-full pointer-events-none"
        )}
      >
        <div className="px-6 py-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              
              <div>
                <h1 className="text-3xl font-bold text-foreground">Relatório de Tráfego  </h1>
                <p className="text-sm text-muted-foreground">
                  {data.client.company} - {data.client.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Kiosk mode toggle */}
              <Button
                variant={kioskMode ? "default" : "outline"}
                size="sm"
                onClick={toggleKioskMode}
                title={kioskMode ? "Desativar modo Kiosk" : "Ativar modo Kiosk (oculta controles após 5s)"}
              >
                <Monitor className="h-4 w-4" />
              </Button>

              {/* Theme toggle */}
              {mounted && <Button variant="outline" size="sm" onClick={toggleTheme} title={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}>
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>}

              {/* Fullscreen button */}
              <Button variant="outline" size="sm" onClick={toggleFullscreen} title={isFullscreen ? "Sair da tela cheia (ESC)" : "Tela cheia"}>
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>

              {/* Auto-refresh controls */}
              <div className="flex items-center gap-3 border-r border-border pr-3">
                <div className="flex items-center gap-2">
                  <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
                  <Label htmlFor="auto-refresh" className="text-sm cursor-pointer">
                    Auto-refresh
                  </Label>
                </div>
                {autoRefresh && <>
                    <Select value={refreshInterval} onValueChange={setRefreshInterval}>
                      <SelectTrigger className="w-24 h-8 text-sm">
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
                    <span className="text-xs text-muted-foreground">
                      Próx: {getTimeUntilRefresh()}
                    </span>
                  </>}
              </div>

              {/* Manual refresh button */}
              <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isLoading}>
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>

              {/* Date picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? dateRange.to ? <>
                          {format(dateRange.from, "dd/MM/yy", {
                      locale: ptBR
                    })} -{" "}
                          {format(dateRange.to, "dd/MM/yy", {
                      locale: ptBR
                    })}
                        </> : format(dateRange.from, "dd/MM/yy", {
                    locale: ptBR
                  }) : <span>Período</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={{
                  from: dateRange.from,
                  to: dateRange.to
                }} onSelect={handleDateSelect as any} numberOfMonths={2} locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
        {/* Metrics Cards */}
        <MetricsCards metrics={data.metrics} />

        {/* Funnel and Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FunnelVisualization metrics={data.metrics} />
          <PerformanceMetrics metrics={data.metrics} />
        </div>

        {/* Timeline Chart */}
        <TimelineChart data={data.timeline} />

        {/* Top Campaigns and Table */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <TopCampaignsPie campaigns={data.top_campaigns} />
          </div>
          <div className="lg:col-span-3">
            <CampaignsTable campaigns={data.campaigns_table} />
          </div>
        </div>
      </div>
    </div>;
};
export default ClientDashboardPublic;