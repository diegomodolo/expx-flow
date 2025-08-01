import {
  Home,
  LayoutDashboard,
  Users,
  Megaphone,
  UsersRound,
  BarChart3,
  BookOpen,
  Settings,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

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
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Campanhas", url: "/campanhas", icon: Megaphone },
  { title: "Squad/Tarefas", url: "/squad", icon: UsersRound },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Base de Conhecimento", url: "/conhecimento", icon: BookOpen },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar
      className={`${isCollapsed ? "w-16" : "w-64"} bg-white border-r border-gray-200`}
      collapsible="icon"
    >
      <SidebarContent className="pt-6 px-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
                          isActive
                            ? "bg-blue-50 text-blue-600 border-l-4 border-blue-500"
                            : "text-gray-700 hover:bg-gray-50"
                        }`
                      }
                    >
                      <item.icon className={`w-5 h-5 ${
                        isActive(item.url) ? "text-blue-600" : "text-gray-500"
                      }`} />
                      {!isCollapsed && (
                        <span className={`font-medium ${
                          isActive(item.url) ? "text-blue-600" : "text-gray-700"
                        }`}>
                          {item.title}
                        </span>
                      )}
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