import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users as UsersIcon,
  MessageSquare,
  Megaphone,
  FileText,
  Trophy,
  Activity,
  Shield,
  BarChart3,
  Settings,
  LucideIcon
} from 'lucide-react';

interface TabItem {
  title: string;
  path: string;
  icon: LucideIcon;
}

const tabs: TabItem[] = [
  { title: 'Dashboard', path: '/cs/groupops', icon: LayoutDashboard },
  { title: 'Grupos', path: '/cs/groupops/grupos', icon: MessageSquare },
  { title: 'Membros', path: '/cs/groupops/membros', icon: UsersIcon },
  { title: 'Campanhas', path: '/cs/groupops/campanhas', icon: Megaphone },
  { title: 'Templates', path: '/cs/groupops/templates', icon: FileText },
  { title: 'Pontuação', path: '/cs/groupops/pontuacao', icon: Trophy },
  { title: 'Eventos', path: '/cs/groupops/eventos', icon: Activity },
  { title: 'Moderação', path: '/cs/groupops/moderacao', icon: Shield },
  { title: 'Relatórios', path: '/cs/groupops/relatorios', icon: BarChart3 },
  { title: 'Configurações', path: '/cs/groupops/configuracoes', icon: Settings },
];

export default function GroupOpsLayout() {
  const location = useLocation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">GroupOps</h1>
        <p className="text-sm text-muted-foreground">Gestão & Engajamento de Grupos WhatsApp</p>
      </div>

      {/* Tab navigation */}
      <div className="border-b overflow-x-auto">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((tab) => {
            const isActive =
              tab.path === '/cs/groupops'
                ? location.pathname === '/cs/groupops'
                : location.pathname.startsWith(tab.path);

            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                end={tab.path === '/cs/groupops'}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.title}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <Outlet />
    </div>
  );
}
