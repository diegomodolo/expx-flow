import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Megaphone,
  Layers,
  Image,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Users,
  FileText,
  GitCompare,
  User,
  StickyNote,
  UserX,
  DollarSign,
  Clock,
  Kanban,
} from "lucide-react";

interface ClientDetailsLayoutProps {
  children: ReactNode;
  clientId: string;
  clientName: string;
}

export function ClientDetailsLayout({ children, clientId, clientName }: ClientDetailsLayoutProps) {
  const location = useLocation();

  const navItems = [
    {
      title: "Dashboard",
      href: `/clientes/${clientId}`,
      icon: LayoutDashboard,
      description: "Visão geral e métricas principais"
    },
    {
      title: "Campanhas",
      href: `/clientes/${clientId}/campanhas`,
      icon: Megaphone,
      description: "Gerenciar campanhas ativas"
    },
    {
      title: "Conjuntos de Anúncios",
      href: `/clientes/${clientId}/conjuntos`,
      icon: Layers,
      description: "Ver conjuntos de anúncios"
    },
    {
      title: "Criativos",
      href: `/clientes/${clientId}/criativos`,
      icon: Image,
      description: "Gerenciar criativos e anúncios"
    },
    {
      title: "Funil de Conversão",
      href: `/clientes/${clientId}/funil`,
      icon: TrendingUp,
      description: "Análise do funil de vendas"
    },
    {
      title: "Alertas & Sugestões",
      href: `/clientes/${clientId}/alertas`,
      icon: AlertTriangle,
      description: "Ver alertas e sugestões"
    },
    {
      title: "Análise Completa",
      href: `/clientes/${clientId}/analise`,
      icon: BarChart3,
      description: "Análise detalhada"
    },
    {
      title: "Análise Competitiva",
      href: `/clientes/${clientId}/competitiva`,
      icon: Users,
      description: "Comparar com concorrentes"
    },
    {
      title: "Relatório Semanal",
      href: `/clientes/${clientId}/relatorio`,
      icon: FileText,
      description: "Relatórios semanais"
    },
    {
      title: "Comparação de Períodos",
      href: `/clientes/${clientId}/comparacao`,
      icon: GitCompare,
      description: "Comparar períodos"
    },
    {
      title: "Contato & Dados",
      href: `/clientes/${clientId}/contato`,
      icon: User,
      description: "Informações de contato"
    },
    {
      title: "Anotações",
      href: `/clientes/${clientId}/anotacoes`,
      icon: StickyNote,
      description: "Anotações sobre o cliente"
    },
    {
      title: "Leads Desqualificados",
      href: `/clientes/${clientId}/leads-desqualificados`,
      icon: UserX,
      description: "Gerenciar leads desqualificados"
    },
    {
      title: "Conversões Offline",
      href: `/clientes/${clientId}/conversoes`,
      icon: DollarSign,
      description: "Rastrear conversões offline"
    },
    {
      title: "CRM",
      href: `/clientes/${clientId}/crm`,
      icon: Kanban,
      description: "Gerenciar leads no mini CRM"
    },
    {
      title: "Histórico",
      href: `/clientes/${clientId}/historico`,
      icon: Clock,
      description: "Histórico de alterações"
    }
  ];

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <Card className="w-64 h-fit sticky top-4 flex-shrink-0">
        <CardContent className="p-4">
          <div className="mb-4 pb-4 border-b">
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">
              Cliente
            </h3>
            <p className="font-medium truncate" title={clientName}>
              {clientName}
            </p>
          </div>
          
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.title}</div>
                  </div>
                </Link>
              );
            })}
          </nav>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
