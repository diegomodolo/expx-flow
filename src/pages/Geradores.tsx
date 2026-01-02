import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { GeneratorCard } from "@/components/content-generator/GeneratorCard";
import { BookOpen, Sparkles, Palette, Presentation, Wand2, FileText, Eye, Settings } from "lucide-react";

export default function Geradores() {
  const navigate = useNavigate();

  const generators: Array<{
    id: string;
    title: string;
    description: string;
    icon: typeof BookOpen;
    color: "blue" | "purple" | "pink" | "teal" | "amber";
    path: string;
  }> = [
    {
      id: "revisao-diaria",
      title: "Revisão Diária de Anúncios",
      description: "Revise e aprove os anúncios gerados pela IA diariamente",
      icon: Eye,
      color: "amber",
      path: "/geradores/revisao-diaria",
    },
    {
      id: "configuracao-agenda",
      title: "Configuração da Fábrica",
      description: "Configure a geração automática de anúncios para cada cliente",
      icon: Settings,
      color: "teal",
      path: "/geradores/configuracao-agenda",
    },
    {
      id: "planejamento",
      title: "Planejador de Conteúdo",
      description: "Planeje suas postagens mensais com ajuda da IA integrada",
      icon: FileText,
      color: "teal",
      path: "/geradores/planejamento-conteudo",
    },
    {
      id: "campanhas",
      title: "Gerador de Campanhas",
      description: "Crie campanhas completas com estratégias e configurações inteligentes",
      icon: BookOpen,
      color: "blue",
      path: "/geradores/campanhas",
    },
    {
      id: "conteudo",
      title: "Gerador de Conteúdo",
      description: "Crie conteúdo profissional para redes sociais, anúncios e campanhas",
      icon: Sparkles,
      color: "purple",
      path: "/geradores/conteudo",
    },
    {
      id: "criativos",
      title: "Gerador de Criativos",
      description: "Crie criativos visuais profissionais com inteligência artificial",
      icon: Palette,
      color: "pink",
      path: "/geradores/criativos",
    },
    {
      id: "apresentacoes",
      title: "Gerador de Apresentações",
      description: "Crie apresentações profissionais de conteúdo para aprovação dos clientes",
      icon: Presentation,
      color: "blue",
      path: "/geradores/apresentacoes",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
            <Wand2 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Geradores com IA</h1>
            <p className="text-muted-foreground mt-1">
              Escolha qual tipo de conteúdo você deseja gerar com inteligência artificial
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {generators.map((generator) => (
            <GeneratorCard
              key={generator.id}
              icon={generator.icon}
              title={generator.title}
              description={generator.description}
              color={generator.color}
              onClick={() => navigate(generator.path)}
            />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
