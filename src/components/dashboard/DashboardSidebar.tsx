import {
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
  { title: "Dashboard", url: "/", icon: LayoutDashboard, color: "bg-blue-500" },
  { title: "Clientes", url: "/clientes", icon: Users, color: "bg-emerald-500" },
  { title: "Campanhas", url: "/campanhas", icon: Megaphone, color: "bg-purple-500" },
  { title: "Squad/Tarefas", url: "/squad", icon: UsersRound, color: "bg-orange-500" },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, color: "bg-rose-500" },
  { title: "Base de Conhecimento", url: "/conhecimento", icon: BookOpen, color: "bg-cyan-500" },
  { title: "Configurações", url: "/configuracoes", icon: Settings, color: "bg-slate-500" },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar
      className={`${isCollapsed ? "w-16" : "w-64"} bg-gradient-to-b from-white to-gray-50/50 border-r border-gray-200/60 shadow-sm`}
      collapsible="icon"
    >
      <SidebarContent className="pt-6 px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={({ isActive }) =>
                        `group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ease-in-out ${
                          isActive
                            ? "bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/25 transform scale-[1.02]"
                            : "text-gray-700 hover:bg-gray-100/80 hover:shadow-sm hover:transform hover:scale-[1.01]"
                        }`
                      }
                    >
                      <div className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
                        isActive(item.url) 
                          ? "bg-white/20 text-white" 
                          : `${item.color} text-white group-hover:shadow-md group-hover:scale-110`
                      }`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      {!isCollapsed && (
                        <span className={`font-medium text-sm transition-all duration-200 ${
                          isActive(item.url) ? "text-white" : "text-gray-700 group-hover:text-gray-900"
                        }`}>
                          {item.title}
                        </span>
                      )}
                      {isActive(item.url) && !isCollapsed && (
                        <div className="absolute right-3 w-1 h-6 bg-white/40 rounded-full" />
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