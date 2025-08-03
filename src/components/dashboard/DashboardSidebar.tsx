import { useState } from "react";
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
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Campanhas", url: "/campanhas", icon: Megaphone },
  { title: "Squad", url: "/squad", icon: UsersRound },
  { title: "Tarefas", url: "/tarefas", icon: CheckSquare },
  { title: "Colaboradores", url: "/colaboradores", icon: UserCheck },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Base de Conhecimento", url: "/conhecimento", icon: BookOpen },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function DashboardSidebar() {
  const [isHovered, setIsHovered] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  // Sidebar fica retraído por padrão, expande no hover como overlay
  const isExpanded = isHovered;

  return (
    <Sidebar
      className={`h-screen bg-white border-r border-gray-200 transition-all duration-300 ease-in-out z-30 ${
        isExpanded ? "w-64 shadow-lg" : "w-16"
      }`}
      collapsible="icon"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <SidebarContent className="pt-24 px-2">
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
                        `flex items-center ${isExpanded ? 'gap-3 px-4' : 'justify-center px-2'} py-3 rounded-lg transition-all duration-300 ${
                          isActive
                            ? "bg-blue-50 text-blue-600"
                            : "text-gray-700 hover:bg-gray-50"
                        }`
                      }
                      title={!isExpanded ? item.title : ''}
                    >
                      <item.icon className={`w-5 h-5 transition-colors duration-200 ${
                        isActive(item.url) ? "text-blue-600" : "text-gray-500"
                      }`} />
                      {isExpanded && (
                        <span className={`font-medium transition-all duration-300 ${
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