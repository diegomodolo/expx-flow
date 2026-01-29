import React, { useState, useMemo } from "react";
import {
  Home,
  Users,
  Megaphone,
  UsersRound,
  RotateCcw,
  CheckSquare,
  BarChart3,
  Settings,
  UserCheck,
  Brain,
  Bot,
  GitBranch,
  FileText,
  Wand2,
  Zap,
  CalendarClock,
  MessageCircle,
  Database,
  ChevronDown,
  Activity,
  ListChecks,
  LayoutGrid,
  TrendingUp,
  Sparkles,
  Building2,
  Bell,
  LucideIcon,
  Tv,
  ExternalLink,
  Images,
  Heart,
  Rocket,
  Briefcase,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useEmployeePermissions, MenuItemType } from "@/hooks/useEmployeePermissions";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useSystemAlerts } from "@/hooks/useSystemAlerts";
import { useCompanyTvDashboardToken } from "@/hooks/useCompanyTvDashboardToken";
import { useSocialTvDashboardToken } from "@/hooks/useSocialTvDashboardToken";
import { useRadarTvDashboardToken } from "@/hooks/useRadarTvDashboardToken";
import { useCsTvDashboardToken } from "@/hooks/useCsTvDashboardToken";

interface MenuItem {
  title: string;
  url: string;
  icon: LucideIcon;
  permission: MenuItemType;
  badge?: number;
  isExternal?: boolean;
  externalUrl?: string;
}

interface MenuCategory {
  title: string;
  icon: LucideIcon;
  items: MenuItem[];
  defaultOpen?: boolean;
}

const menuCategories: MenuCategory[] = [
  // Visão Geral sempre primeiro
  {
    title: "Visão Geral",
    icon: LayoutGrid,
    defaultOpen: true,
    items: [
      { title: "Dashboard", url: "/dashboard", icon: Home, permission: "dashboard" as MenuItemType },
      { title: "Radar de Saúde", url: "/radar-saude", icon: Activity, permission: "dashboard" as MenuItemType },
      { title: "Rotinas Diárias", url: "/rotinas", icon: ListChecks, permission: "dashboard" as MenuItemType },
    ].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')),
  },
  // Demais categorias em ordem alfabética
  ...[
    {
      title: "Clientes & Leads",
      icon: Users,
      items: [
        { title: "Clientes", url: "/clientes", icon: Users, permission: "clientes" as MenuItemType },
        { title: "Funis", url: "/editor-funil", icon: GitBranch, permission: "editor-funil" as MenuItemType },
        { title: "Lead Intelligence", url: "/lead-intelligence", icon: Database, permission: "configuracoes" as MenuItemType },
      ].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')),
    },
    {
      title: "Customer Success",
      icon: Heart,
      items: [
        { title: "Cockpit", url: "/cs/cockpit", icon: Rocket, permission: "clientes" as MenuItemType },
        { title: "Carteira", url: "/cs/carteira", icon: Briefcase, permission: "clientes" as MenuItemType },
        { title: "Jornada", url: "/cs/jornada", icon: TrendingUp, permission: "clientes" as MenuItemType },
        { title: "Ações", url: "/cs/acoes", icon: Zap, permission: "clientes" as MenuItemType },
        { title: "Clientes CS", url: "/cs/clientes", icon: Users, permission: "clientes" as MenuItemType },
        { title: "CS TV", url: "#cs-tv-dashboard", icon: Tv, permission: "clientes" as MenuItemType, isExternal: true },
      ].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')),
    },
    {
      title: "Conteúdo & Social",
      icon: Sparkles,
      items: [
        { title: "Agendamento", url: "/agendamento", icon: CalendarClock, permission: "campanhas" as MenuItemType },
        { title: "Automatizadores", url: "/automatizadores", icon: Zap, permission: "campanhas" as MenuItemType },
        { title: "Dashboard TV", url: "#social-tv-dashboard", icon: Tv, permission: "geradores" as MenuItemType, isExternal: true },
        { title: "Geradores", url: "/geradores", icon: Wand2, permission: "geradores" as MenuItemType },
        { title: "Planejador de Conteúdo", url: "/geradores/planejamento-conteudo", icon: FileText, permission: "geradores" as MenuItemType },
        { title: "Repositório de Criativos", url: "/repositorio-criativos", icon: Images, permission: "geradores" as MenuItemType },
        { title: "WhatsApp", url: "/notificacoes/whatsapp", icon: MessageCircle, permission: "whatsapp" as MenuItemType },
      ].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')),
    },
    {
      title: "Equipe & Sistema",
      icon: Building2,
      items: [
        { title: "Alertas", url: "/alertas", icon: Bell, permission: "dashboard" as MenuItemType },
        { title: "Colaboradores", url: "/colaboradores", icon: UserCheck, permission: "colaboradores" as MenuItemType },
        { title: "Configurações", url: "/configuracoes", icon: Settings, permission: "configuracoes" as MenuItemType },
        { title: "Relatórios", url: "/relatorios", icon: BarChart3, permission: "relatorios" as MenuItemType },
        { title: "Squad", url: "/squad", icon: UsersRound, permission: "squad" as MenuItemType },
        { title: "Tarefas", url: "/tarefas", icon: CheckSquare, permission: "tarefas" as MenuItemType },
        { title: "Tarefas Recorrentes", url: "/tarefas-recorrentes", icon: RotateCcw, permission: "tarefas" as MenuItemType },
      ].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')),
    },
    {
      title: "Inteligência Artificial",
      icon: Brain,
      items: [
        { title: "Agentes de IA", url: "/ia/agents", icon: Bot, permission: "agentes-ia" as MenuItemType },
        { title: "IA", url: "/ia", icon: Brain, permission: "ia" as MenuItemType },
      ].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')),
    },
    {
      title: "Marketing & Tráfego",
      icon: TrendingUp,
      items: [
        { title: "Automações", url: "/automacoes", icon: Zap, permission: "campanhas" as MenuItemType },
        { title: "Campanhas", url: "/campanhas", icon: Megaphone, permission: "campanhas" as MenuItemType },
        { title: "Campanhas Unificadas", url: "/campanhas-unificadas", icon: Activity, permission: "campanhas" as MenuItemType },
        { title: "Dashboard TV", url: "#tv-dashboard", icon: Tv, permission: "dashboard" as MenuItemType, isExternal: true },
        { title: "Keyword Planner", url: "/keyword-planner", icon: Sparkles, permission: "campanhas" as MenuItemType },
        { title: "Radar TV", url: "#radar-tv-dashboard", icon: Activity, permission: "dashboard" as MenuItemType, isExternal: true },
        { title: "Relatórios Marketing", url: "/marketing/relatorios", icon: BarChart3, permission: "campanhas" as MenuItemType },
      ].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')),
    },
  ].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')),
];

export function DashboardSidebar() {
  const { open, setOpen } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { hasPermission, permissionsLoading, isOwner } = useEmployeePermissions();
  const { unresolvedCriticalCount } = useSystemAlerts();
  const { token: tvToken, generateToken, generating: generatingToken } = useCompanyTvDashboardToken();
  const { token: socialTvToken, generateToken: generateSocialTvToken, generating: generatingSocialTvToken } = useSocialTvDashboardToken();
  const { token: radarTvToken, generateToken: generateRadarTvToken, generating: generatingRadarTvToken } = useRadarTvDashboardToken();
  const { token: csTvToken, generateToken: generateCsTvToken, generating: generatingCsTvToken } = useCsTvDashboardToken();
  
  // Track which categories are expanded
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    menuCategories.forEach(cat => {
      initial[cat.title] = cat.defaultOpen || false;
    });
    return initial;
  });

  const isActive = (path: string) => currentPath === path || currentPath.startsWith(path + '/');

  // Filter categories and items based on permissions and add dynamic badges
  const visibleCategories = useMemo(() => {
    return menuCategories.map(category => {
      const filteredItems = category.items.filter(item => {
        if (isOwner) return true;
        if (permissionsLoading) {
          return item.permission === 'dashboard' || item.permission === 'tarefas';
        }
        return hasPermission(item.permission);
      }).map(item => {
        // Add dynamic badge for Alertas
        if (item.url === '/alertas' && unresolvedCriticalCount > 0) {
          return { ...item, badge: unresolvedCriticalCount };
        }
        return item;
      });
      
      return { ...category, items: filteredItems };
    }).filter(category => category.items.length > 0);
  }, [permissionsLoading, isOwner, hasPermission, unresolvedCriticalCount]);

  // Auto-expand category containing active route
  React.useEffect(() => {
    visibleCategories.forEach(category => {
      const hasActiveItem = category.items.some(item => isActive(item.url));
      if (hasActiveItem && !expandedCategories[category.title]) {
        setExpandedCategories(prev => ({ ...prev, [category.title]: true }));
      }
    });
  }, [currentPath]);

  const toggleCategory = (categoryTitle: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryTitle]: !prev[categoryTitle],
    }));
  };

  return (
    <>
      {/* Overlay when sidebar is expanded */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-200"
          onClick={() => setOpen(false)}
        />
      )}
      
      {/* Google-style Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 h-full z-50 transition-all duration-200 ease-in-out bg-card shadow-google-sm flex flex-col",
          open ? "w-[280px]" : "w-[72px]"
        )}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {/* Logo area */}
        <div className="h-16 flex items-center px-5 flex-shrink-0">
          <img 
            src="https://i.imgur.com/RMzwUaa.png" 
            alt="Expx Flow" 
            className="w-8 h-8 object-contain flex-shrink-0"
          />
          {open && (
            <span className="ml-4 text-base font-medium text-foreground tracking-tight whitespace-nowrap">
              Expx Flow
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto overflow-x-hidden">
          <div className="space-y-1">
            {visibleCategories.map((category) => (
              <Collapsible
                key={category.title}
                open={open ? expandedCategories[category.title] : false}
                onOpenChange={() => open && toggleCategory(category.title)}
              >
                {/* Category Header */}
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex items-center gap-3 py-2.5 rounded-full transition-all duration-150",
                      open ? "px-4 hover:bg-muted/50" : "px-0 justify-center",
                      "text-muted-foreground"
                    )}
                    title={!open ? category.title : undefined}
                  >
                    <category.icon 
                      className="w-5 h-5 flex-shrink-0 text-muted-foreground" 
                      strokeWidth={1.5}
                    />
                    {open && (
                      <>
                        <span className="text-sm font-medium tracking-wide whitespace-nowrap flex-1 text-left text-foreground">
                          {category.title}
                        </span>
                        <ChevronDown 
                          className={cn(
                            "w-4 h-4 transition-transform duration-200 text-muted-foreground",
                            expandedCategories[category.title] && "rotate-180"
                          )}
                        />
                      </>
                    )}
                  </button>
                </CollapsibleTrigger>

                {/* Category Items */}
                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                  <div className={cn("space-y-0.5", open ? "ml-4 mt-1" : "mt-1")}>
                    {category.items.map((item) => {
                      // Handle external Dashboard TV link (Marketing & Tráfego)
                      if (item.isExternal && item.url === '#tv-dashboard') {
                        const handleTvDashboardClick = async (e: React.MouseEvent) => {
                          e.preventDefault();
                          if (tvToken) {
                            window.open(`/tv/${tvToken}`, '_blank');
                          } else {
                            const newToken = await generateToken();
                            if (newToken) {
                              window.open(`/tv/${newToken}`, '_blank');
                            }
                          }
                        };

                        return (
                          <button
                            key={item.url}
                            onClick={handleTvDashboardClick}
                            disabled={generatingToken}
                            className={cn(
                              "flex items-center py-2 rounded-full transition-all duration-150 w-full",
                              open ? "gap-3 px-4" : "justify-center px-0",
                              "text-muted-foreground hover:bg-muted/50"
                            )}
                            title={!open ? item.title : undefined}
                          >
                            <item.icon 
                              className="w-4 h-4 flex-shrink-0 text-muted-foreground" 
                              strokeWidth={1.5}
                            />
                            {open && (
                              <>
                                <span className="text-sm tracking-wide whitespace-nowrap text-foreground">
                                  {generatingToken ? 'Gerando...' : item.title}
                                </span>
                                <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                              </>
                            )}
                          </button>
                        );
                      }

                      // Handle external Social TV Dashboard link (Conteúdo & Social)
                      if (item.isExternal && item.url === '#social-tv-dashboard') {
                        const handleSocialTvDashboardClick = async (e: React.MouseEvent) => {
                          e.preventDefault();
                          if (socialTvToken) {
                            window.open(`/social-tv/${socialTvToken}`, '_blank');
                          } else {
                            const newToken = await generateSocialTvToken();
                            if (newToken) {
                              window.open(`/social-tv/${newToken}`, '_blank');
                            }
                          }
                        };

                        return (
                          <button
                            key={item.url}
                            onClick={handleSocialTvDashboardClick}
                            disabled={generatingSocialTvToken}
                            className={cn(
                              "flex items-center py-2 rounded-full transition-all duration-150 w-full",
                              open ? "gap-3 px-4" : "justify-center px-0",
                              "text-muted-foreground hover:bg-muted/50"
                            )}
                            title={!open ? item.title : undefined}
                          >
                            <item.icon 
                              className="w-4 h-4 flex-shrink-0 text-muted-foreground" 
                              strokeWidth={1.5}
                            />
                            {open && (
                              <>
                                <span className="text-sm tracking-wide whitespace-nowrap text-foreground">
                                  {generatingSocialTvToken ? 'Gerando...' : item.title}
                                </span>
                                <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                              </>
                            )}
                          </button>
                        );
                      }

                      // Handle external Radar TV Dashboard link (Marketing & Tráfego)
                      if (item.isExternal && item.url === '#radar-tv-dashboard') {
                        const handleRadarTvDashboardClick = async (e: React.MouseEvent) => {
                          e.preventDefault();
                          if (radarTvToken) {
                            window.open(`/radar-tv/${radarTvToken}`, '_blank');
                          } else {
                            const newToken = await generateRadarTvToken();
                            if (newToken) {
                              window.open(`/radar-tv/${newToken}`, '_blank');
                            }
                          }
                        };

                        return (
                          <button
                            key={item.url}
                            onClick={handleRadarTvDashboardClick}
                            disabled={generatingRadarTvToken}
                            className={cn(
                              "flex items-center py-2 rounded-full transition-all duration-150 w-full",
                              open ? "gap-3 px-4" : "justify-center px-0",
                              "text-muted-foreground hover:bg-muted/50"
                            )}
                            title={!open ? item.title : undefined}
                          >
                            <item.icon 
                              className="w-4 h-4 flex-shrink-0 text-muted-foreground" 
                              strokeWidth={1.5}
                            />
                            {open && (
                              <>
                                <span className="text-sm tracking-wide whitespace-nowrap text-foreground">
                                  {generatingRadarTvToken ? 'Gerando...' : item.title}
                                </span>
                                <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                              </>
                            )}
                          </button>
                        );
                      }

                      // Handle external CS TV Dashboard link (Customer Success)
                      if (item.isExternal && item.url === '#cs-tv-dashboard') {
                        const handleCsTvDashboardClick = async (e: React.MouseEvent) => {
                          e.preventDefault();
                          if (csTvToken) {
                            window.open(`/cs-tv/${csTvToken}`, '_blank');
                          } else {
                            const newToken = await generateCsTvToken();
                            if (newToken) {
                              window.open(`/cs-tv/${newToken}`, '_blank');
                            }
                          }
                        };

                        return (
                          <button
                            key={item.url}
                            onClick={handleCsTvDashboardClick}
                            disabled={generatingCsTvToken}
                            className={cn(
                              "flex items-center py-2 rounded-full transition-all duration-150 w-full",
                              open ? "gap-3 px-4" : "justify-center px-0",
                              "text-muted-foreground hover:bg-muted/50"
                            )}
                            title={!open ? item.title : undefined}
                          >
                            <item.icon 
                              className="w-4 h-4 flex-shrink-0 text-muted-foreground" 
                              strokeWidth={1.5}
                            />
                            {open && (
                              <>
                                <span className="text-sm tracking-wide whitespace-nowrap text-foreground">
                                  {generatingCsTvToken ? 'Gerando...' : item.title}
                                </span>
                                <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                              </>
                            )}
                          </button>
                        );
                      }

                      return (
                        <NavLink 
                          key={item.url}
                          to={item.url} 
                          end={item.url === "/dashboard"}
                          className={({ isActive: active }) =>
                            cn(
                              "flex items-center py-2 rounded-full transition-all duration-150",
                              open ? "gap-3 px-4" : "justify-center px-0",
                              active
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted/50"
                            )
                          }
                          title={!open ? item.title : undefined}
                        >
                          <item.icon 
                            className={cn(
                              "w-4 h-4 flex-shrink-0 transition-colors duration-150",
                              isActive(item.url) ? "text-primary" : "text-muted-foreground"
                            )} 
                            strokeWidth={isActive(item.url) ? 2 : 1.5}
                          />
                          {open && (
                            <span className={cn(
                              "text-sm tracking-wide whitespace-nowrap",
                              isActive(item.url) ? "text-primary font-medium" : "text-foreground"
                            )}>
                              {item.title}
                            </span>
                          )}
                          {item.badge && item.badge > 0 && open && (
                            <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
}
