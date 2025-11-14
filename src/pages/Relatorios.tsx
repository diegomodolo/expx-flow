import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ReportCard } from "@/components/reports/ReportCard";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
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
  Lightbulb,
  Search,
  TrendingDown,
  DollarSign,
  Image,
  FileX
} from "lucide-react";

const Relatorios = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const allReports = [
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
      title: "Análise de Orçamento",
      description: "Orçamento vs. gasto de clientes, utilização, projeções e alertas críticos",
      icon: DollarSign,
      category: "estrategico",
      isAiPowered: false,
      href: "/dashboard-orcamento",
      iconColor: "#FFFFFF",
      iconBg: "hsl(142, 71%, 45%)"
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
    },
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
    },
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
    },
    {
      title: "Alertas Críticos",
      description: "Clientes em alerta, motivos e ações recomendadas pela IA",
      icon: AlertTriangle,
      category: "alertas",
      isAiPowered: true,
      href: "/relatorios/alertas-criticos",
      iconColor: "#FFFFFF",
      iconBg: "hsl(0, 84%, 60%)"
    },
    {
      title: "Clientes em Zona Crítica",
      description: "Identificação de clientes com campanhas problemáticas",
      icon: AlertTriangle,
      category: "alertas",
      isAiPowered: true,
      href: "/relatorios/clientes-zona-critica",
      iconColor: "#FFFFFF",
      iconBg: "hsl(0, 72%, 51%)"
    },
    {
      title: "Criativos de Baixo Desempenho",
      description: "Anúncios que estão queimando verba sem retorno",
      icon: Image,
      category: "performance",
      isAiPowered: true,
      href: "/relatorios/criativos-baixo-desempenho",
      iconColor: "#FFFFFF",
      iconBg: "hsl(25, 95%, 53%)"
    },
    {
      title: "Campanhas Ineficientes",
      description: "Campanhas com baixo ROI e desperdício de orçamento",
      icon: TrendingDown,
      category: "performance",
      isAiPowered: true,
      href: "/relatorios/campanhas-ineficientes",
      iconColor: "#FFFFFF",
      iconBg: "hsl(348, 83%, 47%)"
    },
    {
      title: "Orçamento Mal Distribuído",
      description: "Análise de distribuição de verba no funil de vendas",
      icon: DollarSign,
      category: "orcamento",
      isAiPowered: true,
      href: "/relatorios/orcamento-mal-distribuido",
      iconColor: "#FFFFFF",
      iconBg: "hsl(262, 83%, 58%)"
    },
    {
      title: "Admin - Reports de Leads",
      description: "Administração de reports de leads desqualificados e evidências",
      icon: FileX,
      category: "operacional",
      href: "/leads-desqualificados",
      iconColor: "#FFFFFF",
      iconBg: "hsl(350, 89%, 60%)"
    },
    {
      title: "Snapshots de Performance",
      description: "Histórico de métricas diárias coletadas do Facebook Ads",
      icon: Activity,
      category: "operacional",
      href: "/relatorios/snapshots-performance",
      iconColor: "#FFFFFF",
      iconBg: "hsl(160, 84%, 39%)"
    }
  ];

  const filteredReports = allReports.filter(report =>
    report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar relatórios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredReports.map((report) => (
            <ReportCard
              key={report.href}
              {...report}
              onClick={() => navigate(report.href)}
            />
          ))}
        </div>

        {filteredReports.length === 0 && searchTerm && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Nenhum relatório encontrado para "{searchTerm}"
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Relatorios;