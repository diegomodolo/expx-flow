import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Eye,
  Settings,
  Trophy,
  History,
  Rocket,
  Factory,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FabricaAnunciosLayoutProps {
  children: ReactNode;
}

export function FabricaAnunciosLayout({ children }: FabricaAnunciosLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    {
      title: "Dashboard",
      href: "/geradores/fabrica-anuncios/dashboard",
      icon: BarChart3,
      description: "Métricas de geração e publicação",
    },
    {
      title: "Revisão Diária",
      href: "/geradores/fabrica-anuncios/revisao-diaria",
      icon: Eye,
      description: "Revisar anúncios gerados",
    },
    {
      title: "Configurações",
      href: "/geradores/fabrica-anuncios/configuracao",
      icon: Settings,
      description: "Configurar geração automática",
    },
    {
      title: "Anúncios Vencedores",
      href: "/geradores/fabrica-anuncios/vencedores",
      icon: Trophy,
      description: "Melhores performances",
    },
    {
      title: "Histórico de Gerações",
      href: "/geradores/fabrica-anuncios/historico",
      icon: History,
      description: "Timeline de gerações",
    },
    {
      title: "Publicações Autopilot",
      href: "/geradores/fabrica-anuncios/publicacoes-autopilot",
      icon: Rocket,
      description: "Criativos publicados",
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
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/5">
                <Factory className="w-5 h-5 text-amber-500" />
              </div>
            </div>
            <h3 className="font-semibold text-foreground">
              Fábrica de Anúncios
            </h3>
            <p className="text-xs text-muted-foreground">
              Geração automatizada com IA
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
