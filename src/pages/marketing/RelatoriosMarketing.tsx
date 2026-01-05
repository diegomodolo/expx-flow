import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ReportCard } from "@/components/reports/ReportCard";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { 
  Search,
  Wallet,
  TrendingUp,
  Target,
  BarChart3
} from "lucide-react";

const RelatoriosMarketing = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const allReports = [
    {
      title: "Saldo Pré-Pagos",
      description: "Saldo atual, gasto diário, dia de recarga e previsão de duração dos clientes pré-pagos",
      icon: Wallet,
      category: "financeiro",
      isAiPowered: false,
      href: "/marketing/relatorios/saldo-pre-pagos",
      iconColor: "#FFFFFF",
      iconBg: "hsl(142, 76%, 36%)"
    },
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
          <h1 className="text-3xl font-bold text-foreground">Relatórios de Marketing</h1>
          <p className="text-muted-foreground mt-2">
            Relatórios específicos para análise de campanhas, orçamentos e performance de tráfego
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

export default RelatoriosMarketing;
