import { User, Building, Settings } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const settingsItems = [
  {
    title: "Perfil",
    url: "/configuracoes",
    icon: User,
    description: "Configurações pessoais e informações do usuário"
  },
  {
    title: "Empresa",
    url: "/configuracoes/empresa",
    icon: Building,
    description: "Dados e configurações da empresa"
  },
];

export function SettingsSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/configuracoes") {
      return currentPath === "/configuracoes";
    }
    return currentPath.startsWith(path);
  };

  const getNavCls = (active: boolean) =>
    active ? "bg-muted text-primary font-medium" : "hover:bg-muted/50";

  return (
    <Sidebar className="w-64 border-r">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 mb-4">
            <Settings className="h-4 w-4" />
            Configurações
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/configuracoes"}
                      className={({ isActive }) => getNavCls(isActive)}
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{item.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      </div>
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