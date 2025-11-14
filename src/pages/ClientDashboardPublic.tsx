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
import { CalendarIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const ClientDashboardPublic = () => {
  const { token } = useParams<{ token: string }>();
  const [period, setPeriod] = useState(30);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });

  const { data, isLoading, error } = useClientDashboard(token || "", period);

  const handleDateSelect = (range: { from: Date; to: Date } | undefined) => {
    if (range?.from && range?.to) {
      setDateRange(range);
      const days = Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24));
      setPeriod(days);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive text-lg font-semibold">Erro ao carregar dashboard</p>
          <p className="text-muted-foreground">Token inválido ou expirado</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="h-screen w-screen bg-background overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card flex-shrink-0">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg"
                alt="Meta"
                className="h-8"
              />
              <div>
                <h1 className="text-3xl font-bold text-foreground">Relatório Meta Ads</h1>
                <p className="text-sm text-muted-foreground">
                  {data.client.company} - {data.client.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} -{" "}
                          {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                        </>
                      ) : (
                        format(dateRange.from, "dd/MM/yy", { locale: ptBR })
                      )
                    ) : (
                      <span>Período</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={handleDateSelect as any}
                    numberOfMonths={2}
                    locale={ptBR}
                  />
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
    </div>
  );
};

export default ClientDashboardPublic;
