import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { User, Shield } from "lucide-react";

interface ProfileLayoutProps {
  children: ReactNode;
}

const profileNavItems = [
  {
    title: "Meu Perfil",
    href: "/perfil",
    icon: User,
    description: "Informações pessoais e foto"
  },
  {
    title: "Segurança",
    href: "/perfil/seguranca",
    icon: Shield,
    description: "Senha e autenticação"
  }
];

export const ProfileLayout = ({ children }: ProfileLayoutProps) => {
  const location = useLocation();
  
  const isActiveRoute = (href: string) => {
    if (href === "/perfil") {
      return location.pathname === "/perfil";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Navigation Sidebar */}
      <div className="lg:col-span-1">
        <Card>
          <CardContent className="p-4">
            <nav className="space-y-2">
              {profileNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.href);
                
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={`flex items-start space-x-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                      isActive 
                        ? "bg-accent text-accent-foreground font-medium" 
                        : "text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    </div>
                  </NavLink>
                );
              })}
            </nav>
          </CardContent>
        </Card>
      </div>

      {/* Content Area */}
      <div className="lg:col-span-3">
        {children}
      </div>
    </div>
  );
};