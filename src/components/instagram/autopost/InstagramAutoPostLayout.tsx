import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Settings, 
  Clock, 
  ImageIcon, 
  Youtube, 
  FileText, 
  History,
  Rss,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const navItems: NavItem[] = [
  {
    id: 'scheduled-posts',
    title: 'Postagens Agendadas',
    icon: Calendar,
    description: 'Posts na fila de publicação',
  },
  {
    id: 'config',
    title: 'Configuração',
    icon: Settings,
    description: 'Briefing e conta do Instagram',
  },
  {
    id: 'schedule',
    title: 'Grade de Agendamento',
    icon: Clock,
    description: 'Dias e horários de postagem',
  },
  {
    id: 'themes',
    title: 'Temas de Conteúdo',
    icon: Lightbulb,
    description: 'Temas para geração de criativos',
  },
  {
    id: 'reference-images',
    title: 'Imagens de Referência',
    icon: ImageIcon,
    description: 'Imagens para orientar a IA',
  },
  {
    id: 'youtube',
    title: 'Vídeos do YouTube',
    icon: Youtube,
    description: 'Base de conhecimento em vídeo',
  },
  {
    id: 'pdf',
    title: 'Arquivos PDF',
    icon: FileText,
    description: 'Base de conhecimento em texto',
  },
  {
    id: 'rss',
    title: 'Feeds RSS',
    icon: Rss,
    description: 'Notícias e artigos automáticos',
  },
  {
    id: 'history',
    title: 'Histórico de Postagens',
    icon: History,
    description: 'Posts já publicados',
  },
];

interface InstagramAutoPostLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

export function InstagramAutoPostLayout({
  children,
  activeSection,
  onSectionChange,
  title,
  subtitle,
  headerActions,
}: InstagramAutoPostLayoutProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
        {headerActions}
      </div>

      {/* Layout */}
      <div className="flex gap-6 min-h-[600px]">
        {/* Sidebar */}
        <Card className="w-72 p-4 h-fit sticky top-4">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              const Icon = item.icon;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className={cn(
                      "text-xs truncate",
                      isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}>
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </Card>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
