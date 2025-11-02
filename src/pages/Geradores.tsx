import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { GeneratorCard } from "@/components/content-generator/GeneratorCard";
import { BookOpen, Sparkles, Palette, Wand2 } from "lucide-react";

export default function Geradores() {
  const navigate = useNavigate();

  const generators: Array<{
    id: string;
    title: string;
    description: string;
    icon: typeof BookOpen;
    color: "blue" | "purple" | "pink";
    path: string;
  }> = [
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
