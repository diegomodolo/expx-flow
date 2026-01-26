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
  LucideIcon,
  Building2,
  ChevronDown
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CSSquadFilterProvider, useCSSquadFilter } from '@/contexts/CSSquadFilterContext';

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

function SquadSelector() {
  const { selectedSquadId, setSelectedSquadId, squads, isLoading, mySquadId, mySquadName } = useCSSquadFilter();

  const getDisplayValue = () => {
    if (selectedSquadId === null) return 'all';
    if (selectedSquadId === mySquadId) return 'my-squad';
    return selectedSquadId;
  };

  const handleChange = (value: string) => {
    if (value === 'all') {
      setSelectedSquadId(null);
    } else if (value === 'my-squad') {
      setSelectedSquadId(mySquadId);
    } else {
      setSelectedSquadId(value);
    }
  };

  const selectedSquad = squads.find(s => s.id === selectedSquadId);

  return (
    <div className="px-2 mb-4">
      <div className="hidden group-hover:block">
        <Select value={getDisplayValue()} onValueChange={handleChange} disabled={isLoading}>
          <SelectTrigger className="w-full h-9 text-xs">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0" />
              <SelectValue placeholder="Selecionar Squad" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Todos os Squads
              </span>
            </SelectItem>
            {mySquadId && (
              <SelectItem value="my-squad">
                <span className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary" />
                  Meu Squad ({mySquadName})
                </span>
              </SelectItem>
            )}
            {squads.map((squad) => (
              <SelectItem key={squad.id} value={squad.id}>
                <span className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: squad.color || '#6B7280' }} 
                  />
                  {squad.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Collapsed view - just icon */}
      <div className="group-hover:hidden flex justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "p-1.5 rounded-md cursor-pointer hover:bg-muted",
              selectedSquadId && "bg-primary/10"
            )}>
              <Building2 className={cn("h-5 w-5", selectedSquadId && "text-primary")} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="font-medium">
              {selectedSquadId === null 
                ? 'Todos os Squads' 
                : selectedSquad?.name || 'Squad selecionado'
              }
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function CSLayoutContent() {
  const location = useLocation();
  const { selectedSquadId, squads } = useCSSquadFilter();
  
  const selectedSquad = squads.find(s => s.id === selectedSquadId);
  
  return (
    <DashboardLayout>
      <div className="flex h-full">
        {/* Sidebar interna do CS */}
        <TooltipProvider>
          <nav className="w-14 hover:w-56 transition-all duration-200 ease-in-out border-r bg-card flex flex-col gap-1 py-4 px-2 group overflow-hidden">
            <div className="mb-2 px-2 group-hover:px-3 transition-all">
              <Heart className="h-6 w-6 text-primary" />
              <span className="hidden group-hover:block text-sm font-semibold mt-1 whitespace-nowrap">
                Customer Success
              </span>
            </div>
            
            {/* Squad Selector */}
            <SquadSelector />
            
            {/* Active Squad Badge (when squad is selected) */}
            {selectedSquadId && selectedSquad && (
              <div className="hidden group-hover:block px-2 mb-2">
                <Badge 
                  variant="outline" 
                  className="w-full justify-center text-xs"
                  style={{ 
                    borderColor: selectedSquad.color || undefined,
                    backgroundColor: selectedSquad.color ? `${selectedSquad.color}20` : undefined 
                  }}
                >
                  {selectedSquad.name}
                </Badge>
              </div>
            )}
            
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

export default function CSLayout() {
  return (
    <CSSquadFilterProvider>
      <CSLayoutContent />
    </CSSquadFilterProvider>
  );
}
