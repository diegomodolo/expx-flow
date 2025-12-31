import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Building, Bell, CreditCard, Facebook, Calendar, Shield, Gauge, RefreshCw, MessageCircle, Database, Sparkles } from "lucide-react";
import { SiGoogle } from "react-icons/si";

interface SettingsLayoutProps {
  children: React.ReactNode;
}

const settingsNavItems = [
  {
    title: "Empresa",
    href: "/configuracoes",
    icon: Building,
    description: "Configurações da empresa",
  },
  {
    title: "Notificações",
    href: "/configuracoes/notificacoes",
    icon: Bell,
    description: "Preferências de notificação",
  },
  {
    title: "Planos",
    href: "/configuracoes/planos",
    icon: CreditCard,
    description: "Assinatura e faturamento",
  },
  {
    title: "Facebook Ads",
    href: "/configuracoes/facebook",
    icon: Facebook,
    description: "Integração com Facebook Ads",
  },
  {
    title: "Sincronização Facebook",
    href: "/configuracoes/sincronizacao-facebook",
    icon: RefreshCw,
    description: "Agendamento automático de sincronização",
  },
  {
    title: "Google Ads",
    href: "/configuracoes/integracao-google",
    icon: SiGoogle as any,
    description: "Integração com Google Ads",
  },
  {
    title: "Sincronização Google",
    href: "/configuracoes/sincronizacao-google",
    icon: RefreshCw,
    description: "Sincronização do Google Ads",
  },
  {
    title: "Keyword Planner",
    href: "/configuracoes/keyword-planner",
    icon: Sparkles,
    description: "Planejador de palavras-chave do Google",
  },
  {
    title: "Planner",
    href: "/configuracoes/planner",
    icon: Calendar,
    description: "Configurar slots de tempo para o planner diário",
  },
  {
    title: "Parâmetros de Performance",
    href: "/configuracoes/parametros-performance",
    icon: Gauge,
    description: "Critérios de status dos clientes",
  },
  {
    title: "Permissões",
    href: "/configuracoes/permissoes",
    icon: Shield,
    description: "Gerenciar permissões de acesso dos colaboradores",
  },
  {
    title: "WhatsApp (Z-API)",
    href: "/configuracoes/whatsapp",
    icon: MessageCircle,
    description: "Integração com WhatsApp para alertas",
  },
  {
    title: "ListaCNAE",
    href: "/configuracoes/listacnae",
    icon: Database,
    description: "Importar empresas da base CNPJ",
  },
];

export const SettingsLayout = ({ children }: SettingsLayoutProps) => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* Settings Sidebar */}
      <Card className="w-80 p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Configurações</h2>
            <p className="text-sm text-muted-foreground">
              Gerencie suas preferências e configurações
            </p>
          </div>
          
          <Separator />
          
          <nav className="space-y-1">
            {settingsNavItems.map((item) => {
              const isActive = currentPath === item.href;
              const Icon = item.icon;
              
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className={`text-xs truncate ${
                      isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}>
                      {item.description}
                    </div>
                  </div>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </Card>

      {/* Settings Content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
};