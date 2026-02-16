import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Building, Bell, CreditCard, Facebook, Calendar, Shield, Gauge, RefreshCw, MessageCircle, Database, SlidersHorizontal, ChevronDown, Plug } from "lucide-react";
import { SiGoogle, SiDiscord } from "react-icons/si";

interface SettingsLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  title: string;
  href: string;
  icon: any;
  description: string;
}

interface NavGroup {
  title: string;
  description: string;
  icon: any;
  items: NavItem[];
}

const settingsNavItems: NavItem[] = [
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
    title: "Padrões de Uso",
    href: "/configuracoes/padroes-de-uso",
    icon: SlidersHorizontal,
    description: "Regras globais de comportamento do sistema",
  },
];

const settingsNavGroups: NavGroup[] = [
  {
    title: "Integrações",
    description: "Conecte plataformas e serviços externos",
    icon: Plug,
    items: [
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
        title: "WhatsApp (Z-API)",
        href: "/configuracoes/whatsapp",
        icon: MessageCircle,
        description: "Integração com WhatsApp para alertas",
      },
      {
        title: "Discord",
        href: "/configuracoes/discord",
        icon: SiDiscord as any,
        description: "Integração com Discord para notificações",
      },
      {
        title: "ListaCNAE",
        href: "/configuracoes/listacnae",
        icon: Database,
        description: "Importar empresas da base CNPJ",
      },
    ],
  },
];

const NavItemLink = ({ item, isActive }: { item: NavItem; isActive: boolean }) => {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.href}
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
        isActive
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{item.title}</div>
        <div className={`text-xs truncate ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
          {item.description}
        </div>
      </div>
    </NavLink>
  );
};

export const SettingsLayout = ({ children }: SettingsLayoutProps) => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Auto-open groups that contain the active route
  const groupHasActiveItem = (group: NavGroup) =>
    group.items.some((item) => currentPath === item.href);

  return (
    <div className="flex gap-6 min-h-[600px]">
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
            {settingsNavItems.map((item) => (
              <NavItemLink key={item.href} item={item} isActive={currentPath === item.href} />
            ))}

            {settingsNavGroups.map((group) => {
              const GroupIcon = group.icon;
              const isGroupActive = groupHasActiveItem(group);

              return (
                <Collapsible key={group.title} defaultOpen={isGroupActive}>
                  <CollapsibleTrigger className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-muted text-muted-foreground hover:text-foreground w-full group">
                    <GroupIcon className="h-4 w-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-left">{group.title}</div>
                      <div className="text-xs truncate text-muted-foreground">{group.description}</div>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-4 border-l border-border pl-2 mt-1 space-y-1">
                      {group.items.map((item) => (
                        <NavItemLink key={item.href} item={item} isActive={currentPath === item.href} />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </nav>
        </div>
      </Card>

      <div className="flex-1">{children}</div>
    </div>
  );
};