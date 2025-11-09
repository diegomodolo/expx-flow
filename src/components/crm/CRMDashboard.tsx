import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Phone, Users, CheckCircle2, ChevronDown, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { useCRMDashboardData, formatRelativeTime, formatCurrency, getInitials } from "@/hooks/useCRMDashboardData";
import { useCRMWorkspaceGoals } from "@/hooks/useCRMWorkspaceGoals";
import { StatCardWithGoal } from "./StatCardWithGoal";
import { GoalsConfigModal } from "./GoalsConfigModal";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CRMDashboardProps {
  workspaceId: string;
}

type PeriodOption = 'today' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom';

function getActivityIcon(type: string) {
  switch (type) {
    case "stage_change":
      return Users;
    case "note_added":
      return CheckCircle2;
    case "email_sent":
      return Phone;
    default:
      return CheckCircle2;
  }
}
function getActivityColor(type: string) {
  switch (type) {
    case "stage_change":
      return "bg-primary/20 text-primary";
    case "note_added":
      return "bg-success/20 text-success";
    case "email_sent":
      return "bg-warning/20 text-warning";
    default:
      return "bg-primary/20 text-primary";
  }
}
export function CRMDashboard({
  workspaceId
}: CRMDashboardProps) {
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [periodOption, setPeriodOption] = useState<PeriodOption>('last30days');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  
  // Calcular datas com base na opção selecionada
  const getDateRange = (): { startDate: Date; endDate: Date } => {
    const now = new Date();
    
    switch (periodOption) {
      case 'today':
        return {
          startDate: startOfDay(now),
          endDate: endOfDay(now)
        };
      case 'last7days':
        return {
          startDate: startOfDay(subDays(now, 7)),
          endDate: endOfDay(now)
        };
      case 'last30days':
        return {
          startDate: startOfDay(subDays(now, 30)),
          endDate: endOfDay(now)
        };
      case 'thisMonth':
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now)
        };
      case 'lastMonth':
        const lastMonth = subDays(startOfMonth(now), 1);
        return {
          startDate: startOfMonth(lastMonth),
          endDate: endOfMonth(lastMonth)
        };
      case 'custom':
        return {
          startDate: customStartDate ? startOfDay(customStartDate) : startOfDay(subDays(now, 30)),
          endDate: customEndDate ? endOfDay(customEndDate) : endOfDay(now)
        };
      default:
        return {
          startDate: startOfDay(subDays(now, 30)),
          endDate: endOfDay(now)
        };
    }
  };

  const { startDate, endDate } = getDateRange();
  
  const {
    data,
    isLoading
  } = useCRMDashboardData(workspaceId, startDate, endDate);

  const { calculateGoalsProgress } = useCRMWorkspaceGoals(workspaceId);

  const getPeriodLabel = () => {
    switch (periodOption) {
      case 'today':
        return 'Hoje';
      case 'last7days':
        return 'Últimos 7 dias';
      case 'last30days':
        return 'Últimos 30 dias';
      case 'thisMonth':
        return 'Este mês';
      case 'lastMonth':
        return 'Mês passado';
      case 'custom':
        if (customStartDate && customEndDate) {
          return `${format(customStartDate, 'dd/MM', { locale: ptBR })} - ${format(customEndDate, 'dd/MM/yy', { locale: ptBR })}`;
        }
        return 'Período personalizado';
      default:
        return 'Últimos 30 dias';
    }
  };
  const getComparisonLabel = () => {
    switch (periodOption) {
      case 'today':
        return 'vs. ontem';
      case 'last7days':
      case 'last30days':
        return 'vs. período anterior';
      case 'thisMonth':
      case 'lastMonth':
        return 'vs. mês anterior';
      case 'custom':
        return 'vs. período anterior';
      default:
        return 'vs. período anterior';
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  if (!data) {
    return <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Nenhum dado disponível</p>
      </div>;
  }
  const {
    metrics,
    leadsByStage,
    leadsOverTime,
    activities,
    recentLeads
  } = data;

  // Calcular progresso das metas
  const goalsProgress = calculateGoalsProgress({
    totalLeads: metrics.totalLeads,
    revenue: metrics.revenue,
    conversionRate: metrics.conversionRate,
    closedDeals: metrics.closedDeals
  });
  return <div className="space-y-8">
      {/* Page Heading */}
      <div className="flex flex-wrap justify-between gap-4 items-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Painel de Controle</h1>
          <p className="text-base text-muted-foreground">
            Visão geral do seu desempenho de vendas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                {getPeriodLabel()}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setPeriodOption('today')}>
                Hoje
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPeriodOption('last7days')}>
                Últimos 7 dias
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPeriodOption('last30days')}>
                Últimos 30 dias
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPeriodOption('thisMonth')}>
                Este mês
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPeriodOption('lastMonth')}>
                Mês passado
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <Popover>
                <PopoverTrigger asChild>
                  <button 
                    className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent rounded-sm cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPeriodOption('custom');
                    }}
                  >
                    Período personalizado
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end" side="left">
                  <div className="p-3 space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Data inicial</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !customStartDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customStartDate ? format(customStartDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={customStartDate}
                            onSelect={setCustomStartDate}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Data final</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !customEndDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customEndDate ? format(customEndDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={customEndDate}
                            onSelect={setCustomEndDate}
                            initialFocus
                            disabled={(date) => customStartDate ? date < customStartDate : false}
                            className={cn("p-3 pointer-events-auto")}
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setIsGoalsModalOpen(true)}>
            Personalizar Painel
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCardWithGoal
          title="Total de Leads"
          value={metrics.totalLeads}
          target={goalsProgress.leads.target}
          change={`${metrics.totalLeadsChange > 0 ? "+" : ""}${metrics.totalLeadsChange}% ${getComparisonLabel()}`}
          isPositive={metrics.totalLeadsChange >= 0}
          goalStatus={goalsProgress.leads.status}
          percentage={goalsProgress.leads.percentage}
        />
        <StatCardWithGoal
          title="Receita do Mês"
          value={metrics.revenue}
          target={goalsProgress.revenue.target}
          change={`${metrics.revenueChange > 0 ? "+" : ""}${metrics.revenueChange}% ${getComparisonLabel()}`}
          isPositive={metrics.revenueChange >= 0}
          goalStatus={goalsProgress.revenue.status}
          percentage={goalsProgress.revenue.percentage}
          formatValue={formatCurrency}
        />
        <StatCardWithGoal
          title="Taxa de Conversão"
          value={metrics.conversionRate}
          target={goalsProgress.conversion.target}
          change={`${metrics.conversionRateChange > 0 ? "+" : ""}${metrics.conversionRateChange}% ${getComparisonLabel()}`}
          isPositive={metrics.conversionRateChange >= 0}
          goalStatus={goalsProgress.conversion.status}
          percentage={goalsProgress.conversion.percentage}
          formatValue={(val) => `${val.toFixed(1)}%`}
        />
        <StatCardWithGoal
          title="Negócios Fechados"
          value={metrics.closedDeals}
          target={goalsProgress.closedDeals.target}
          change={`${metrics.closedDealsChange > 0 ? "+" : ""}${metrics.closedDealsChange} ${getComparisonLabel()}`}
          isPositive={metrics.closedDealsChange >= 0}
          goalStatus={goalsProgress.closedDeals.status}
          percentage={goalsProgress.closedDeals.percentage}
        />
      </div>

      {/* Goals Config Modal */}
      <GoalsConfigModal
        open={isGoalsModalOpen}
        onOpenChange={setIsGoalsModalOpen}
        workspaceId={workspaceId}
        currentMetrics={{
          totalLeads: metrics.totalLeads,
          revenue: metrics.revenue,
          conversionRate: metrics.conversionRate,
          closedDeals: metrics.closedDeals
        }}
      />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads por Estágio */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Leads por Estágio</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadsByStage}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{
                fill: "hsl(var(--muted-foreground))"
              }} tickLine={{
                stroke: "hsl(var(--border))"
              }} />
                <YAxis tick={{
                fill: "hsl(var(--muted-foreground))"
              }} tickLine={{
                stroke: "hsl(var(--border))"
              }} />
                <Tooltip contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem"
              }} labelStyle={{
                color: "hsl(var(--foreground))"
              }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Próximas Atividades */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Últimas Atividades

          </h3>
            <a href="#" className="text-sm font-medium text-primary hover:underline">
              Ver mais
            </a>
          </div>
          <div className="space-y-4">
            {activities.length > 0 ? activities.map(activity => {
            const Icon = getActivityIcon(activity.type);
            const colorClasses = getActivityColor(activity.type);
            return <div key={activity.id} className="flex items-start gap-4">
                    <div className={`p-2 rounded-full ${colorClasses}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{activity.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatRelativeTime(activity.created_at)}
                      </p>
                    </div>
                  </div>;
          }) : <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma atividade recente
              </p>}
          </div>
        </Card>

        {/* Evolução de Leads */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Evolução de Leads ({getPeriodLabel()})</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={leadsOverTime}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{
                fill: "hsl(var(--muted-foreground))"
              }} tickLine={{
                stroke: "hsl(var(--border))"
              }} />
                <YAxis tick={{
                fill: "hsl(var(--muted-foreground))"
              }} tickLine={{
                stroke: "hsl(var(--border))"
              }} />
                <Tooltip contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem"
              }} labelStyle={{
                color: "hsl(var(--foreground))"
              }} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{
                fill: "hsl(var(--primary))",
                r: 4
              }} activeDot={{
                r: 6
              }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Novos Leads */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Novos Leads</h3>
            <a href="#" className="text-sm font-medium text-primary hover:underline">
              Ver mais
            </a>
          </div>
          <div className="space-y-4">
            {recentLeads.length > 0 ? recentLeads.map(lead => <div key={lead.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{getInitials(lead.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{lead.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {lead.email || "Sem email"}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatRelativeTime(lead.created_at)}
                  </p>
                </div>) : <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum lead recente
              </p>}
          </div>
        </Card>
      </div>
    </div>;
}