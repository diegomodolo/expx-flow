import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  DollarSign, 
  Activity, 
  Target, 
  Thermometer, 
  FileText,
  ArrowLeft 
} from "lucide-react";
import { CRMPipelineReport } from "./reports/CRMPipelineReport";
import { CRMSalesReport } from "./reports/CRMSalesReport";
import { CRMActivitiesReport } from "./reports/CRMActivitiesReport";
import { CRMSourcesReport } from "./reports/CRMSourcesReport";
import { CRMTemperatureReport } from "./reports/CRMTemperatureReport";
import { CRMExecutiveReport } from "./reports/CRMExecutiveReport";

interface CRMReportsProps {
  workspaceId: string;
}

type ReportView = 'grid' | 'pipeline' | 'sales' | 'activities' | 'sources' | 'temperature' | 'executive';

const reportCards = [
  {
    id: 'pipeline' as ReportView,
    title: 'Análise de Pipeline',
    description: 'Conversões, tempo por estágio e gargalos identificados',
    icon: TrendingUp,
    color: 'hsl(var(--primary))',
    badge: 'Essencial'
  },
  {
    id: 'sales' as ReportView,
    title: 'Performance de Vendas',
    description: 'Receita total, ticket médio e taxa de fechamento',
    icon: DollarSign,
    color: '#22c55e',
    badge: 'Essencial'
  },
  {
    id: 'activities' as ReportView,
    title: 'Análise de Atividades',
    description: 'Engajamento e tempo de resposta por lead',
    icon: Activity,
    color: '#a855f7',
    badge: null
  },
  {
    id: 'sources' as ReportView,
    title: 'Análise de Fontes',
    description: 'Performance por origem e UTM',
    icon: Target,
    color: '#f97316',
    badge: null
  },
  {
    id: 'temperature' as ReportView,
    title: 'Análise de Temperatura',
    description: 'Distribuição e conversão por qualificação',
    icon: Thermometer,
    color: '#ef4444',
    badge: null
  },
  {
    id: 'executive' as ReportView,
    title: 'Relatório Executivo',
    description: 'Visão consolidada com insights e exportação PDF',
    icon: FileText,
    color: '#6b7280',
    badge: 'Premium'
  }
];

export function CRMReports({ workspaceId }: CRMReportsProps) {
  const [currentView, setCurrentView] = useState<ReportView>('grid');

  const renderReport = () => {
    switch (currentView) {
      case 'pipeline':
        return <CRMPipelineReport workspaceId={workspaceId} />;
      case 'sales':
        return <CRMSalesReport workspaceId={workspaceId} />;
      case 'activities':
        return <CRMActivitiesReport workspaceId={workspaceId} />;
      case 'sources':
        return <CRMSourcesReport workspaceId={workspaceId} />;
      case 'temperature':
        return <CRMTemperatureReport workspaceId={workspaceId} />;
      case 'executive':
        return <CRMExecutiveReport workspaceId={workspaceId} />;
      default:
        return null;
    }
  };

  if (currentView !== 'grid') {
    return (
      <div className="space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => setCurrentView('grid')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Relatórios
        </Button>
        {renderReport()}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Relatórios</h1>
        <p className="text-muted-foreground">
          Análises detalhadas do seu pipeline de vendas e performance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportCards.map((report) => {
          const Icon = report.icon;
          return (
            <Card
              key={report.id}
              className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-border bg-card"
              onClick={() => setCurrentView(report.id)}
            >
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${report.color}20` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: report.color }} />
                  </div>
                  {report.badge && (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      report.badge === 'Essencial' 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-secondary/10 text-secondary-foreground'
                    }`}>
                      {report.badge}
                    </span>
                  )}
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                    {report.title}
                  </CardTitle>
                  <CardDescription className="text-sm mt-1">
                    {report.description}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
