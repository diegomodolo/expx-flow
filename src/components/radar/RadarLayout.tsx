import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Activity, Link2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

interface RadarLayoutProps {
  children: ReactNode;
}

const navItems = [
  {
    title: "Radar de Saúde",
    href: "/radar-saude",
    icon: Activity,
    description: "Saúde geral dos clientes"
  },
  {
    title: "Radar de URLs",
    href: "/radar-saude/urls",
    icon: Link2,
    description: "Saúde das URLs de destino"
  }
];

export function RadarLayout({ children }: RadarLayoutProps) {
  const location = useLocation();

  const isActiveRoute = (href: string) => {
    if (href === "/radar-saude") {
      return location.pathname === "/radar-saude";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <DashboardLayout>
      <div className="flex gap-6">
        {/* Sidebar */}
        <Card className="w-64 shrink-0 h-fit sticky top-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" />
              Radares
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.href);
                
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-all hover:bg-accent",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className={cn(
                      "h-4 w-4 mt-0.5 shrink-0",
                      isActive ? "text-primary" : ""
                    )} />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{item.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </div>
                  </NavLink>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </DashboardLayout>
  );
}
