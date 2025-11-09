import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  TrendingUp, 
  Phone, 
  Users, 
  CheckCircle2,
  ChevronDown 
} from "lucide-react";

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

interface Activity {
  title: string;
  time: string;
  icon: typeof Phone;
  color: string;
}

const activities: Activity[] = [
  { title: "Ligação com Innotech", time: "Hoje, 14:30", icon: Phone, color: "warning" },
  { title: "Reunião com Soluções XYZ", time: "Amanhã, 10:00", icon: Users, color: "primary" },
  { title: "Enviar proposta para Acme Corp", time: "Amanhã, 16:00", icon: CheckCircle2, color: "success" },
  { title: "Reunião de Follow-up", time: "Sexta, 11:00", icon: Users, color: "primary" },
];

interface Lead {
  name: string;
  avatar: string;
  source: string;
  time: string;
  initials: string;
}

const recentLeads: Lead[] = [
  { name: "Ana Clara", source: "via Website", time: "Hoje", initials: "AC", avatar: "" },
  { name: "Bruno Gomes", source: "via Indicação", time: "Ontem", initials: "BG", avatar: "" },
  { name: "Carla Dias", source: "via LinkedIn", time: "2 dias atrás", initials: "CD", avatar: "" },
  { name: "Daniel Souza", source: "via Evento", time: "3 dias atrás", initials: "DS", avatar: "" },
];

export function CRMDashboard() {
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
          value="1,234"
          change="+5.2% vs. mês anterior"
        />
        <StatCard
          title="Receita do Mês"
          value="R$ 89.450"
          change="+12.8% vs. mês anterior"
        />
        <StatCard
          title="Taxa de Conversão"
          value="23.5%"
          change="+1.5% vs. mês anterior"
        />
        <StatCard
          title="Negócios Fechados"
          value="78"
          change="+10 vs. mês anterior"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Negócios Fechados vs. Meta */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Negócios Fechados vs. Meta</h3>
            <a href="#" className="text-sm font-medium text-primary hover:underline">
              Ver mais
            </a>
          </div>
          <div className="flex items-end gap-4 h-64">
            <div className="flex flex-col items-center gap-2">
              <div className="text-sm font-bold">75%</div>
              <div className="relative w-12 h-48 bg-muted rounded-t flex items-end">
                <div className="absolute inset-x-0 bottom-0 h-[75%] w-full bg-primary rounded-t"></div>
              </div>
              <p className="text-xs text-muted-foreground">Meta</p>
            </div>
            
            {/* Placeholder for chart */}
            <div className="flex-grow h-full flex items-center justify-center bg-muted rounded-lg">
              <div className="text-center text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-2" />
                <p>Gráfico de Barras</p>
                <p className="text-xs mt-1">Em desenvolvimento</p>
              </div>
            </div>
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
            {activities.map((activity, index) => {
              const Icon = activity.icon;
              const colorClasses = {
                warning: "bg-warning/20 text-warning",
                primary: "bg-primary/20 text-primary",
                success: "bg-success/20 text-success",
              }[activity.color];

              return (
                <div key={index} className="flex items-start gap-4">
                  <div className={`p-2 rounded-full ${colorClasses}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Previsão de Vendas */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Previsão de Vendas (Próximos 90 dias)</h3>
            <a href="#" className="text-sm font-medium text-primary hover:underline">
              Ver mais
            </a>
          </div>
          <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
            <div className="text-center text-muted-foreground">
              <TrendingUp className="w-12 h-12 mx-auto mb-2" />
              <p>Gráfico de Linha</p>
              <p className="text-xs mt-1">Em desenvolvimento</p>
            </div>
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
            {recentLeads.map((lead, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={lead.avatar} />
                    <AvatarFallback>{lead.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.source}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{lead.time}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
