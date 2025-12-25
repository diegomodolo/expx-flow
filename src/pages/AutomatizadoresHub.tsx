import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Instagram, Facebook, Linkedin, Twitter, Globe, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PlatformCard {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  available: boolean;
  route: string;
  color: string;
}

const platforms: PlatformCard[] = [
  {
    id: "instagram",
    name: "Instagram",
    description: "Automatize postagens no feed do Instagram com IA",
    icon: Instagram,
    available: true,
    route: "/automatizadores/instagram",
    color: "bg-gradient-to-br from-purple-500 to-pink-500"
  },
  {
    id: "wordpress",
    name: "WordPress",
    description: "Publique artigos automaticamente no seu blog",
    icon: Globe,
    available: true,
    route: "/automatizadores/wordpress",
    color: "bg-gradient-to-br from-blue-500 to-cyan-500"
  },
  {
    id: "facebook",
    name: "Facebook",
    description: "Postagens automáticas no Facebook",
    icon: Facebook,
    available: false,
    route: "/automatizadores/facebook",
    color: "bg-gradient-to-br from-blue-600 to-blue-400"
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Automatize posts profissionais no LinkedIn",
    icon: Linkedin,
    available: false,
    route: "/automatizadores/linkedin",
    color: "bg-gradient-to-br from-blue-700 to-blue-500"
  },
  {
    id: "twitter",
    name: "X (Twitter)",
    description: "Postagens automáticas no X",
    icon: Twitter,
    available: false,
    route: "/automatizadores/twitter",
    color: "bg-gradient-to-br from-gray-800 to-gray-600"
  }
];

export default function AutomatizadoresHub() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Automatizadores</h1>
          <p className="text-muted-foreground mt-1">
            Selecione uma plataforma para configurar postagens automáticas com IA
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {platforms.map((platform) => (
            <Card
              key={platform.id}
              className={`relative overflow-hidden transition-all duration-200 ${
                platform.available
                  ? "cursor-pointer hover:shadow-lg hover:scale-[1.02]"
                  : "opacity-60"
              }`}
              onClick={() => platform.available && navigate(platform.route)}
            >
              <div className={`absolute inset-0 ${platform.color} opacity-10`} />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-xl ${platform.color}`}>
                    <platform.icon className="w-6 h-6 text-white" />
                  </div>
                  {!platform.available && (
                    <Badge variant="secondary" className="text-xs">
                      Em breve
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg mt-3">{platform.name}</CardTitle>
                <CardDescription className="text-sm">
                  {platform.description}
                </CardDescription>
              </CardHeader>
              {platform.available && (
                <CardContent className="pt-0">
                  <div className="flex items-center text-sm text-primary font-medium">
                    Configurar
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
