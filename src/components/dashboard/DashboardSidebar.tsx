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
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
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
      className={isCollapsed ? "w-14" : "w-60"}
      collapsible="icon"
    >
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={({ isActive }) =>
                        `flex items-center px-4 py-3 mx-2 rounded-xl transition-colors relative ${
                          isActive
                            ? "bg-primary/15 text-primary before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-8 before:bg-primary before:rounded-r-full"
                            : "text-gray-700 hover:bg-gray-100"
                        }`
                      }
                    >
                      <div className="w-5 h-5 flex items-center justify-center">
                        <item.icon className="w-5 h-5" />
                      </div>
                      {!isCollapsed && <span className="ml-3">{item.title}</span>}
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