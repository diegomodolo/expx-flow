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
  useSidebar,
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
  const { open, setOpen } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar
      collapsible="icon"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className="bg-white border-r border-gray-200"
    >
      <SidebarContent className="pt-6 bg-white">
        {/* Logo Section */}
        <div className="flex items-center justify-center py-2 px-4 mb-4">
          <img 
            src="/lovable-uploads/9e57fd65-0f5a-477a-99bb-948a28292f48.png" 
            alt="Controle de Trafego" 
            className="w-10 h-10 object-contain"
          />
        </div>
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