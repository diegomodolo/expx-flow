import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { GeneratorCard } from "@/components/content-generator/GeneratorCard";
import { BarChart3, Eye, Settings, Trophy, History, Factory, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AutopilotPublishHistory } from "@/components/generators/AutopilotPublishHistory";

export default function FabricaAnuncios() {
  const navigate = useNavigate();

  const fabricaOptions: Array<{
    id: string;
    title: string;
    description: string;
    icon: typeof BarChart3;
    color: "blue" | "purple" | "pink" | "teal" | "amber";
    path: string;
  }> = [
    {
      id: "dashboard-fabrica",
      title: "Dashboard da Fábrica",
      description: "Acompanhe métricas de geração, aprovação e publicação de anúncios",
      icon: BarChart3,
      color: "blue",
      path: "/geradores/fabrica-anuncios/dashboard",
    },
    {
      id: "revisao-diaria",
      title: "Revisão Diária de Anúncios",
      description: "Revise e aprove os anúncios gerados pela IA diariamente",
      icon: Eye,
      color: "amber",
      path: "/geradores/fabrica-anuncios/revisao-diaria",
    },
    {
      id: "configuracao-fabrica",
      title: "Configuração da Fábrica",
      description: "Configure geração automática e modo autopilot de anúncios",
      icon: Settings,
      color: "teal",
      path: "/geradores/fabrica-anuncios/configuracao",
    },
    {
      id: "anuncios-vencedores",
      title: "Anúncios Vencedores",
      description: "Identifique automaticamente os anúncios com melhor performance",
      icon: Trophy,
      color: "amber",
      path: "/geradores/fabrica-anuncios/vencedores",
    },
    {
      id: "historico-geracoes",
      title: "Histórico de Gerações",
      description: "Visualize a timeline completa de anúncios gerados pela IA",
      icon: History,
      color: "purple",
      path: "/geradores/fabrica-anuncios/historico",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/geradores")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/5">
              <Factory className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Fábrica de Anúncios</h1>
              <p className="text-muted-foreground mt-1">
                Geração automatizada de anúncios com inteligência artificial
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fabricaOptions.map((option) => (
            <GeneratorCard
              key={option.id}
              icon={option.icon}
              title={option.title}
              description={option.description}
              color={option.color}
              onClick={() => navigate(option.path)}
            />
          ))}
        </div>

        <AutopilotPublishHistory />
      </div>
    </DashboardLayout>
  );
}
