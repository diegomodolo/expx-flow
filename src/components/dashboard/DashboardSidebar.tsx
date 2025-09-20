import React, { useMemo } from "react";
import {
  Home,
  LayoutDashboard,
  Users,
  Megaphone,
  UsersRound,
  CheckSquare,
  BarChart3,
  BookOpen,
  Settings,
  UserCheck,
  Brain,
  Sparkles,
  Palette,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useEmployeePermissions, MenuItemType } from "@/hooks/useEmployeePermissions";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: Home, permission: "dashboard" as MenuItemType },
  { title: "IA", url: "/ia", icon: Brain, permission: "ia" as MenuItemType },
  { title: "Clientes", url: "/clientes", icon: Users, permission: "clientes" as MenuItemType },
  { title: "Campanhas", url: "/campanhas", icon: Megaphone, permission: "campanhas" as MenuItemType },
  { title: "Squad", url: "/squad", icon: UsersRound, permission: "squad" as MenuItemType },
  { title: "Tarefas", url: "/tarefas", icon: CheckSquare, permission: "tarefas" as MenuItemType },
  { title: "Colaboradores", url: "/colaboradores", icon: UserCheck, permission: "colaboradores" as MenuItemType },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, permission: "relatorios" as MenuItemType },
  { title: "Gerador de Campanhas", url: "/gerador-campanhas", icon: BookOpen, permission: "gerador-campanhas" as MenuItemType },
  { title: "Gerador de Conteúdo", url: "/gerador-conteudo", icon: Sparkles, permission: "gerador-conteudo" as MenuItemType },
  { title: "Gerador de Criativos", url: "/gerador-criativos", icon: Palette, permission: "gerador-criativos" as MenuItemType },
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
    // Always show all items for owners
    if (isOwner) {
      return items;
    }
    
    // During loading, show basic items only
    if (permissionsLoading) {
      return items.filter(item => item.permission === 'dashboard' || item.permission === 'tarefas');
    }
    
    // Filter based on permissions
    const filtered = items.filter(item => hasPermission(item.permission));
    return filtered;
  }, [permissionsLoading, isOwner, hasPermission]);

  return (
    <Sidebar
      variant="floating"
      collapsible="icon"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className="bg-white border-r border-gray-200 shadow-lg fixed left-0 top-0 z-50"
    >
      <SidebarContent className="pt-6 bg-white">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={({ isActive }) =>
                        `flex items-center gap-3 py-3 rounded-lg transition-all duration-300 ${
                          isActive
                            ? "bg-blue-50 text-blue-600"
                            : "text-gray-700 hover:bg-gray-50"
                        }`
                      }
                      title={!open ? item.title : ''}
                    >
                      <item.icon className={`w-5 h-5 transition-colors duration-200 ${
                        isActive(item.url) ? "text-blue-600" : "text-gray-500"
                      }`} />
                      <span className={`font-medium transition-all duration-300 ${
                        isActive(item.url) ? "text-blue-600" : "text-gray-700"
                      }`}>
                        {item.title}
                      </span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}