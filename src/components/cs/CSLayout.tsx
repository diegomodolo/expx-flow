import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { cn } from '@/lib/utils';
import { 
  AlertTriangle, 
  Heart, 
  Trophy, 
  Target, 
  Users,
  LucideIcon
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CSMenuItem {
  title: string;
  url: string;
  icon: LucideIcon;
  description: string;
}

const csMenuItems: CSMenuItem[] = [
  { 
    title: "Radar de Risco", 
    url: "/cs/radar", 
    icon: AlertTriangle,
    description: "Clientes em risco de churn"
  },
  { 
    title: "Saúde 360", 
    url: "/cs/saude", 
    icon: Heart,
    description: "Health Score completo"
  },
  { 
    title: "Jornada", 
    url: "/cs/jornada", 
    icon: Trophy,
    description: "Jornada da Vitória"
  },
  { 
    title: "Ações", 
    url: "/cs/acoes", 
    icon: Target,
    description: "Touchpoints, NPS, QBR"
  },
  { 
    title: "Clientes CS", 
    url: "/cs/clientes", 
    icon: Users,
    description: "Lista de clientes"
  },
];

export default function CSLayout() {
  const location = useLocation();
  
  return (
    <DashboardLayout>
      <div className="flex h-full">
        {/* Sidebar interna do CS */}
        <TooltipProvider>
          <nav className="w-14 hover:w-56 transition-all duration-200 ease-in-out border-r bg-card flex flex-col gap-1 py-4 px-2 group overflow-hidden">
            <div className="mb-4 px-2 group-hover:px-3 transition-all">
              <Heart className="h-6 w-6 text-primary" />
              <span className="hidden group-hover:block text-sm font-semibold mt-1 whitespace-nowrap">
                Customer Success
              </span>
            </div>
            
            {csMenuItems.map((item) => {
              const isActive = location.pathname === item.url;
              
              return (
                <Tooltip key={item.url}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={item.url}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-2 py-2.5 text-muted-foreground transition-all hover:bg-muted/50",
                        isActive && "bg-primary/10 text-primary font-medium"
                      )}
                    >
                      <item.icon className={cn(
                        "h-5 w-5 flex-shrink-0",
                        isActive && "text-primary"
                      )} />
                      <span className="hidden group-hover:block whitespace-nowrap text-sm">
                        {item.title}
                      </span>
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="group-hover:hidden">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>
        </TooltipProvider>
        
        {/* Área de conteúdo */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </DashboardLayout>
  );
}
