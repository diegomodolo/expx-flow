import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Eye,
  Settings,
  Lightbulb,
  History,
  Rocket,
  Layers,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FabricaCarrosseisLayoutProps {
  children: ReactNode;
}

export function FabricaCarrosseisLayout({ children }: FabricaCarrosseisLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    {
      title: "Dashboard",
      href: "/geradores/fabrica-carrosseis/dashboard",
      icon: BarChart3,
      description: "Métricas de geração de carrosseis",
    },
    {
      title: "Revisão Diária",
      href: "/geradores/fabrica-carrosseis/revisao-diaria",
      icon: Eye,
      description: "Revisar carrosseis gerados",
    },
    {
      title: "Configurações",
      href: "/geradores/fabrica-carrosseis/configuracao",
      icon: Settings,
      description: "Configurar geração automática",
    },
    {
      title: "Temas de Pesquisa",
      href: "/geradores/fabrica-carrosseis/temas",
      icon: Lightbulb,
      description: "Gerenciar temas para geração",
    },
    {
      title: "Histórico de Gerações",
      href: "/geradores/fabrica-carrosseis/historico",
      icon: History,
      description: "Timeline de gerações",
    },
    {
      title: "Carrosseis Publicados",
      href: "/geradores/fabrica-carrosseis/publicados",
      icon: Rocket,
      description: "Carrosseis aprovados e publicados",
    },
  ];

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <Card className="w-64 h-fit sticky top-4 flex-shrink-0">
        <CardContent className="p-4">
          <div className="mb-4 pb-4 border-b">
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => navigate("/geradores")}
                title="Voltar para Geradores"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-500/5">
                <Layers className="w-5 h-5 text-violet-500" />
              </div>
            </div>
            <h3 className="font-semibold text-foreground">
              Fábrica de Carrosseis
            </h3>
            <p className="text-xs text-muted-foreground">
              Geração automatizada de carrosseis para Instagram
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
