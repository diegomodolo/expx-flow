import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, LucideIcon } from "lucide-react";

interface GeneratorCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: "blue" | "purple" | "pink" | "teal" | "amber";
  onClick: () => void;
}

const colorClasses = {
  blue: {
    gradient: "from-blue-500/10 to-blue-500/5",
    icon: "text-blue-600",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    hover: "hover:border-blue-300 hover:shadow-blue-100",
  },
  purple: {
    gradient: "from-purple-500/10 to-purple-500/5",
    icon: "text-purple-600",
    badge: "bg-purple-100 text-purple-700 border-purple-200",
    hover: "hover:border-purple-300 hover:shadow-purple-100",
  },
  pink: {
    gradient: "from-pink-500/10 to-pink-500/5",
    icon: "text-pink-600",
    badge: "bg-pink-100 text-pink-700 border-pink-200",
    hover: "hover:border-pink-300 hover:shadow-pink-100",
  },
  teal: {
    gradient: "from-teal-500/10 to-teal-500/5",
    icon: "text-teal-600",
    badge: "bg-teal-100 text-teal-700 border-teal-200",
    hover: "hover:border-teal-300 hover:shadow-teal-100",
  },
  amber: {
    gradient: "from-amber-500/10 to-amber-500/5",
    icon: "text-amber-600",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    hover: "hover:border-amber-300 hover:shadow-amber-100",
  },
};

export function GeneratorCard({
  icon: Icon,
  title,
  description,
  color,
  onClick,
}: GeneratorCardProps) {
  const colors = colorClasses[color];

  return (
    <Card
      className={`relative min-h-[220px] p-6 cursor-pointer transition-all duration-300 hover:shadow-lg ${colors.hover} group`}
      onClick={onClick}
    >
      {/* Badge no canto superior direito */}
      <Badge className={`absolute top-4 right-4 ${colors.badge}`}>
        IA
      </Badge>

      {/* Conteúdo do card */}
      <div className="flex flex-col h-full">
        {/* Ícone e gradiente de fundo */}
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center mb-4`}>
          <Icon className={`w-7 h-7 ${colors.icon}`} />
        </div>

        {/* Título e descrição */}
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>

        {/* Seta de navegação */}
        <div className="flex items-center gap-2 text-sm font-medium text-primary mt-4 group-hover:gap-3 transition-all">
          Começar
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </Card>
  );
}
