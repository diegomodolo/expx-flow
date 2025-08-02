import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ReportCard } from "@/components/reports/ReportCard";
import { useNavigate } from "react-router-dom";
import { 
  TrendingUp, 
  Target, 
  Users, 
  BarChart3, 
  Activity, 
  CheckSquare, 
  Trophy, 
  UserCheck, 
  AlertTriangle,
  Lightbulb
} from "lucide-react";

const Relatorios = () => {
  const navigate = useNavigate();

  const strategicReports = [
    {
      title: "Relatório Executivo",
      description: "Investimento vs Leads, CPL médio, ROI e principais oportunidades",
      icon: TrendingUp,
      category: "estrategico",
      isAiPowered: true,
      href: "/relatorios/executivo",
      iconColor: "#FFFFFF",
      iconBg: "hsl(142, 76%, 36%)"
    },
    {
      title: "Funil Completo",
      description: "Métricas por etapa, gargalos e distribuição de orçamento",
      icon: Target,
      category: "estrategico",
      isAiPowered: true,
      href: "/relatorios/funil",
      iconColor: "#FFFFFF", 
      iconBg: "hsl(218, 91%, 60%)"
    },
    {
      title: "Análise Competitiva",
      description: "Criativos dos concorrentes e sugestões de formatos via IA",
      icon: Users,
      category: "estrategico",
      isAiPowered: true,
      href: "/relatorios/concorrencia",
      iconColor: "#FFFFFF",
      iconBg: "hsl(271, 91%, 65%)"
    },
    {
      title: "Oportunidades",
      description: "Campanhas para escalar, criativos vencedores e insights aplicáveis",
      icon: Lightbulb,
      category: "estrategico", 
      isAiPowered: true,
      href: "/relatorios/oportunidades",
      iconColor: "#FFFFFF",
      iconBg: "hsl(45, 93%, 47%)"
    }
  ];

  const operationalReports = [
    {
      title: "Performance por Cliente",
      description: "KPIs, comparativos mensais e histórico de otimizações",
      icon: BarChart3,
      category: "operacional",
      href: "/relatorios/performance-cliente",
      iconColor: "#FFFFFF",
      iconBg: "hsl(199, 89%, 48%)"
    },
    {
      title: "Campanhas",
      description: "Status, KPIs, performance de Ad Sets e análise de criativos",
      icon: Activity,
      category: "operacional",
      href: "/relatorios/campanhas",
      iconColor: "#FFFFFF",
      iconBg: "hsl(17, 88%, 56%)"
    },
    {
      title: "Tarefas e Planner",
      description: "Produtividade, tempo de execução e slots mais carregados",
      icon: CheckSquare,
      category: "operacional",
      href: "/relatorios/tarefas-planner",
      iconColor: "#FFFFFF",
      iconBg: "hsl(142, 76%, 36%)"
    }
  ];

  const teamReports = [
    {
      title: "Produtividade de Squads",
      description: "Volume de tarefas, eficiência e carga de trabalho distribuída",
      icon: Trophy,
      category: "equipe",
      href: "/relatorios/produtividade-squads",
      iconColor: "#FFFFFF",
      iconBg: "hsl(291, 84%, 61%)"
    },
    {
      title: "RH - Colaboradores",
      description: "Status, retenção, produtividade individual e alocação de squads",
      icon: UserCheck,
      category: "equipe",
      href: "/relatorios/rh-colaboradores",
      iconColor: "#FFFFFF",
      iconBg: "hsl(204, 94%, 44%)"
    }
  ];

  const alertReports = [
    {
      title: "Alertas Críticos",
      description: "Clientes em alerta, motivos e ações recomendadas pela IA",
      icon: AlertTriangle,
      category: "alertas",
      isAiPowered: true,
      href: "/relatorios/alertas-criticos",
      iconColor: "#FFFFFF",
      iconBg: "hsl(0, 84%, 60%)"
    }
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios Inteligentes</h1>
          <p className="text-muted-foreground mt-2">
            Escolha o tipo de relatório que deseja gerar para análise de dados e insights
          </p>
        </div>

        {/* Strategic Reports */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">📊 Relatórios Estratégicos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {strategicReports.map((report) => (
              <ReportCard
                key={report.href}
                {...report}
                onClick={() => navigate(report.href)}
              />
            ))}
          </div>
        </section>

        {/* Operational Reports */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">📈 Relatórios Operacionais</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {operationalReports.map((report) => (
              <ReportCard
                key={report.href}
                {...report}
                onClick={() => navigate(report.href)}
              />
            ))}
          </div>
        </section>

        {/* Team Reports */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">👥 Relatórios de Equipe e Squads</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teamReports.map((report) => (
              <ReportCard
                key={report.href}
                {...report}
                onClick={() => navigate(report.href)}
              />
            ))}
          </div>
        </section>

        {/* Alert Reports */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">🚨 Relatórios de Alertas e Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {alertReports.map((report) => (
              <ReportCard
                key={report.href}
                {...report}
                onClick={() => navigate(report.href)}
              />
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Relatorios;