import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Phone, 
  Users, 
  CheckCircle2,
  ChevronDown,
  Loader2
} from "lucide-react";
import {
  useCRMDashboardData,
  formatRelativeTime,
  formatCurrency,
  getInitials,
} from "@/hooks/useCRMDashboardData";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  isPositive?: boolean;
}

function StatCard({ title, value, change, isPositive = true }: StatCardProps) {
  return (
    <Card className="p-6 space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      <p className={`text-sm font-medium ${isPositive ? 'text-success' : 'text-destructive'}`}>
        {change}
      </p>
    </Card>
  );
}

interface CRMDashboardProps {
  workspaceId: string;
}

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

export function CRMDashboard({ workspaceId }: CRMDashboardProps) {
  const { data, isLoading } = useCRMDashboardData(workspaceId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Nenhum dado disponível</p>
      </div>
    );
  }

  const { metrics, leadsByStage, leadsOverTime, activities, recentLeads } = data;
  return (
    <div className="space-y-8">
      {/* Page Heading */}
      <div className="flex flex-wrap justify-between gap-4 items-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Painel de Controle</h1>
          <p className="text-base text-muted-foreground">
            Visão geral do seu desempenho de vendas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            Últimos 30 dias
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Button>Personalizar Painel</Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Leads"
          value={metrics.totalLeads.toString()}
          change={`${metrics.totalLeadsChange > 0 ? "+" : ""}${metrics.totalLeadsChange}% vs. mês anterior`}
          isPositive={metrics.totalLeadsChange >= 0}
        />
        <StatCard
          title="Receita do Mês"
          value={formatCurrency(metrics.revenue)}
          change={`${metrics.revenueChange > 0 ? "+" : ""}${metrics.revenueChange}% vs. mês anterior`}
          isPositive={metrics.revenueChange >= 0}
        />
        <StatCard
          title="Taxa de Conversão"
          value={`${metrics.conversionRate}%`}
          change={`${metrics.conversionRateChange > 0 ? "+" : ""}${metrics.conversionRateChange}% vs. mês anterior`}
          isPositive={metrics.conversionRateChange >= 0}
        />
        <StatCard
          title="Negócios Fechados"
          value={metrics.closedDeals.toString()}
          change={`${metrics.closedDealsChange > 0 ? "+" : ""}${metrics.closedDealsChange} vs. mês anterior`}
          isPositive={metrics.closedDealsChange >= 0}
        />
      </div>

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
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis 
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Próximas Atividades */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Próximas Atividades</h3>
            <a href="#" className="text-sm font-medium text-primary hover:underline">
              Ver mais
            </a>
          </div>
          <div className="space-y-4">
            {activities.length > 0 ? (
              activities.map((activity) => {
                const Icon = getActivityIcon(activity.type);
                const colorClasses = getActivityColor(activity.type);

                return (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div className={`p-2 rounded-full ${colorClasses}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{activity.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatRelativeTime(activity.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma atividade recente
              </p>
            )}
          </div>
        </Card>

        {/* Evolução de Leads (Últimos 30 dias) */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Evolução de Leads (Últimos 30 dias)</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={leadsOverTime}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis 
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  activeDot={{ r: 6 }}
                />
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
            {recentLeads.length > 0 ? (
              recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between">
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
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum lead recente
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
