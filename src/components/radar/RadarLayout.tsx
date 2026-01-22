import { ReactNode, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Activity, Link2, Menu, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();

  const isActiveRoute = (href: string) => {
    if (href === "/radar-saude") {
      return location.pathname === "/radar-saude";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = isActiveRoute(item.href);
        
        return (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-start gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
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
              <span className="font-medium text-sm">{item.title}</span>
              <span className="text-xs text-muted-foreground hidden xl:block">
                {item.description}
              </span>
            </div>
          </NavLink>
        );
      })}
    </nav>
  );
}

export function RadarLayout({ children }: RadarLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="flex gap-4">
        {/* Mobile Menu Button */}
        <div className="xl:hidden mb-4">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Menu className="h-4 w-4 mr-2" />
                Radares
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-primary" />
                <span className="font-semibold">Radares</span>
              </div>
              <NavContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Sidebar - Hidden on smaller screens */}
        <Card className="w-52 shrink-0 h-fit sticky top-4 hidden xl:block">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Radares
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <NavContent />
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
