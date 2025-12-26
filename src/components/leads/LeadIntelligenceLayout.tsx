import { ReactNode } from "react";
import { useLocation, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { 
  Users, 
  Key, 
  LayoutGrid, 
  History, 
  Filter,
  Brain,
  Database,
  Globe
} from "lucide-react";

interface LeadIntelligenceLayoutProps {
  children: ReactNode;
}

const navItems = [
  {
    title: "Pool de Leads",
    href: "/lead-intelligence",
    icon: Users,
    description: "Visão geral e estatísticas"
  },
  {
    title: "Visão por Segmento",
    href: "/lead-intelligence/segments-view",
    icon: LayoutGrid,
    description: "Dashboard e gerenciamento"
  },
  {
    title: "Base CNAE",
    href: "/lead-intelligence/cnae-base",
    icon: Database,
    description: "Leads por código CNAE"
  },
  {
    title: "Prospecção Google",
    href: "/lead-intelligence/google-prospecting",
    icon: Globe,
    description: "Prospectar leads via Google"
  },
  {
    title: "Histórico",
    href: "/lead-intelligence/history",
    icon: History,
    description: "Log de atividades"
  },
  {
    title: "Filtros Salvos",
    href: "/lead-intelligence/filters",
    icon: Filter,
    description: "Filtros personalizados"
  },
  {
    title: "API Keys",
    href: "/lead-intelligence/api-keys",
    icon: Key,
    description: "Chaves de integração"
  }
];

export function LeadIntelligenceLayout({ children }: LeadIntelligenceLayoutProps) {
  const location = useLocation();

  const isActiveRoute = (href: string) => {
    if (href === "/lead-intelligence") {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="flex gap-6 min-h-[calc(100vh-180px)]">
      {/* Sidebar */}
      <Card className="w-64 shrink-0 p-4">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b">
          <Brain className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">Lead Intelligence</span>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = isActiveRoute(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className={`h-4 w-4 mt-0.5 shrink-0 ${isActive ? "text-primary" : ""}`} />
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${isActive ? "text-primary" : ""}`}>
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </nav>
      </Card>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
