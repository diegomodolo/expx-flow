import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Activity, Link2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
      <div className="flex gap-3 lg:gap-4">
        {/* Sidebar - Compact on smaller screens, expanded on xl+ */}
        <TooltipProvider delayDuration={100}>
          <Card className="w-12 xl:w-52 shrink-0 h-fit sticky top-4 transition-all duration-200">
            {/* Header - Hidden on compact mode */}
            <CardHeader className="pb-2 px-2 pt-2 xl:px-3 xl:pt-3 hidden xl:block">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-primary" />
                Radares
              </CardTitle>
            </CardHeader>
            
            {/* Compact Header - Icon only */}
            <CardHeader className="p-2 xl:hidden">
              <div className="flex justify-center">
                <Activity className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>

            <CardContent className="p-1.5 xl:p-2">
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActiveRoute(item.href);
                  
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <NavLink
                          to={item.href}
                          className={cn(
                            "flex items-center justify-center xl:justify-start gap-2 rounded-lg p-2 xl:px-3 xl:py-2 text-sm transition-all hover:bg-accent",
                            isActive
                              ? "bg-accent text-accent-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Icon className={cn(
                            "h-4 w-4 shrink-0",
                            isActive ? "text-primary" : ""
                          )} />
                          {/* Text - Only visible on xl+ */}
                          <div className="hidden xl:flex flex-col gap-0.5 min-w-0">
                            <span className="font-medium text-sm truncate">{item.title}</span>
                            <span className="text-xs text-muted-foreground truncate">
                              {item.description}
                            </span>
                          </div>
                        </NavLink>
                      </TooltipTrigger>
                      {/* Tooltip - Only on compact mode */}
                      <TooltipContent side="right" className="xl:hidden">
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </TooltipProvider>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </DashboardLayout>
  );
}
