import React, { useMemo } from "react";
import {
  Home,
  LayoutDashboard,
  Users,
  Megaphone,
  UsersRound,
  CheckSquare,
  BarChart3,
  Settings,
  UserCheck,
  Brain,
  Bot,
  GitBranch,
  Wand2,
  Zap,
  Activity,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useEmployeePermissions, MenuItemType } from "@/hooks/useEmployeePermissions";
import { useSidebar } from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: Home, permission: "dashboard" as MenuItemType },
  { title: "IA", url: "/ia", icon: Brain, permission: "ia" as MenuItemType },
  { title: "Agentes de IA", url: "/ia/agents", icon: Bot, permission: "agentes-ia" as MenuItemType },
  { title: "Clientes", url: "/clientes", icon: Users, permission: "clientes" as MenuItemType },
  { title: "Campanhas", url: "/campanhas", icon: Megaphone, permission: "campanhas" as MenuItemType },
  { title: "Campanhas Unificadas", url: "/campanhas-unificadas", icon: Activity, permission: "campanhas" as MenuItemType },
  { title: "Automações", url: "/automacoes", icon: Zap, permission: "campanhas" as MenuItemType },
  { title: "Funis", url: "/editor-funil", icon: GitBranch, permission: "editor-funil" as MenuItemType },
  { title: "Squad", url: "/squad", icon: UsersRound, permission: "squad" as MenuItemType },
  { title: "Tarefas", url: "/tarefas", icon: CheckSquare, permission: "tarefas" as MenuItemType },
  { title: "Colaboradores", url: "/colaboradores", icon: UserCheck, permission: "colaboradores" as MenuItemType },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, permission: "relatorios" as MenuItemType },
  { title: "Geradores", url: "/geradores", icon: Wand2, permission: "geradores" as MenuItemType },
  { title: "Configurações", url: "/configuracoes", icon: Settings, permission: "configuracoes" as MenuItemType },
];

export function DashboardSidebar() {
  const { open, setOpen } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { hasPermission, permissionsLoading, isOwner } = useEmployeePermissions();

  const isActive = (path: string) => currentPath === path;

  // Filter items based on permissions
  const visibleItems = useMemo(() => {
    if (isOwner) {
      return items;
    }
    
    if (permissionsLoading) {
      return items.filter(item => item.permission === 'dashboard' || item.permission === 'tarefas');
    }
    
    const filtered = items.filter(item => hasPermission(item.permission));
    return filtered;
  }, [permissionsLoading, isOwner, hasPermission]);

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
        className={`fixed left-0 top-0 h-full z-50 transition-all duration-200 ease-in-out bg-card shadow-google-sm ${
          open ? 'w-[280px]' : 'w-[72px]'
        }`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {/* Logo area */}
        <div className="h-16 flex items-center px-5">
          <img 
            src="/lovable-uploads/9e57fd65-0f5a-477a-99bb-948a28292f48.png" 
            alt="Logo" 
            className="w-8 h-8 object-contain flex-shrink-0"
          />
          {open && (
            <span className="ml-4 text-base font-medium text-foreground tracking-tight whitespace-nowrap">
              Controle de Trafego
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="px-3 py-2 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 64px)' }}>
          {visibleItems.map((item) => (
            <NavLink 
              key={item.title}
              to={item.url} 
              end 
              className={({ isActive: active }) =>
                `flex items-center ${open ? 'gap-4 px-4' : 'justify-center px-0'} py-2.5 rounded-full transition-all duration-150 ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50"
                }`
              }
              title={!open ? item.title : ''}
            >
              <item.icon 
                className={`w-5 h-5 flex-shrink-0 transition-colors duration-150 ${
                  isActive(item.url) ? "text-primary" : "text-muted-foreground"
                }`} 
                strokeWidth={isActive(item.url) ? 2 : 1.5}
              />
              {open && (
                <span className={`text-sm font-medium tracking-wide whitespace-nowrap ${
                  isActive(item.url) ? "text-primary" : "text-foreground"
                }`}>
                  {item.title}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
}
