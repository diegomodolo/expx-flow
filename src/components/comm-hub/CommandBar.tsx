import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Search,
  Hash,
  Users,
  Building2,
  CheckSquare,
  Settings,
  BarChart3,
  Zap,
  MessageCircle,
  Terminal,
} from 'lucide-react';
import { toast } from 'sonner';

interface CommandBarProps {
  channels: Array<{ id: string; name: string; channel_type: string }>;
  onSelectChannel: (id: string) => void;
  onStatusRequest?: () => void;
}

export function CommandBar({ channels, onSelectChannel, onStatusRequest }: CommandBarProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;

  // Global keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Fetch tasks for search
  const { data: tasks = [] } = useQuery({
    queryKey: ['command-tasks', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await (supabase
        .from('tasks')
        .select('id, title, status')
        .eq('company_id', companyId) as any)
        .in('status', ['todo', 'progress', 'review'])
        .order('updated_at', { ascending: false })
        .limit(15);
      return (data || []) as Array<{ id: string; title: string; status: string }>;
    },
    enabled: !!companyId && open,
    staleTime: 30_000,
  });

  // Fetch team members
  const { data: team = [] } = useQuery({
    queryKey: ['command-team', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await (supabase
        .from('employees')
        .select('id, name, role')
        .eq('company_id', companyId) as any)
        .eq('is_active', true)
        .limit(10);
      return (data || []) as Array<{ id: string; name: string; role: string }>;
    },
    enabled: !!companyId && open,
    staleTime: 60_000,
  });

  const handleSelect = useCallback((value: string) => {
    setOpen(false);

    if (value.startsWith('channel:')) {
      onSelectChannel(value.replace('channel:', ''));
    } else if (value.startsWith('nav:')) {
      navigate(value.replace('nav:', ''));
    } else if (value === 'cmd:status') {
      onStatusRequest?.();
    } else if (value === 'cmd:tarefas') {
      navigate('/tarefas');
    } else if (value === 'cmd:clientes') {
      navigate('/clientes');
    } else if (value === 'cmd:relatorios') {
      navigate('/relatorios');
    } else if (value === 'cmd:config') {
      navigate('/configuracoes');
    }
  }, [onSelectChannel, navigate, onStatusRequest]);

  const channelIcon = (type: string) => {
    switch (type) {
      case 'squad': return Users;
      case 'client': return Building2;
      default: return MessageCircle;
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-muted/50 text-muted-foreground text-sm hover:bg-accent/50 transition-colors w-full max-w-2xl"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="flex-1 text-left">Buscar ou comando...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar canais, tarefas, pessoas ou digitar /comando..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

          {/* Slash Commands */}
          <CommandGroup heading="Comandos Rápidos">
            <CommandItem value="cmd:status" onSelect={() => handleSelect('cmd:status')}>
              <Zap className="mr-2 h-4 w-4 text-primary" />
              <span>/status</span>
              <span className="ml-auto text-xs text-muted-foreground">Resumo do dia</span>
            </CommandItem>
            <CommandItem value="cmd:tarefas" onSelect={() => handleSelect('cmd:tarefas')}>
              <CheckSquare className="mr-2 h-4 w-4 text-primary" />
              <span>/tarefas</span>
              <span className="ml-auto text-xs text-muted-foreground">Ir para tarefas</span>
            </CommandItem>
            <CommandItem value="cmd:clientes" onSelect={() => handleSelect('cmd:clientes')}>
              <Building2 className="mr-2 h-4 w-4 text-primary" />
              <span>/clientes</span>
              <span className="ml-auto text-xs text-muted-foreground">Ir para clientes</span>
            </CommandItem>
            <CommandItem value="cmd:relatorios" onSelect={() => handleSelect('cmd:relatorios')}>
              <BarChart3 className="mr-2 h-4 w-4 text-primary" />
              <span>/relatórios</span>
              <span className="ml-auto text-xs text-muted-foreground">Ir para relatórios</span>
            </CommandItem>
            <CommandItem value="cmd:config" onSelect={() => handleSelect('cmd:config')}>
              <Settings className="mr-2 h-4 w-4 text-primary" />
              <span>/config</span>
              <span className="ml-auto text-xs text-muted-foreground">Configurações</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Channels */}
          {channels.length > 0 && (
            <CommandGroup heading="Canais">
              {channels.map(ch => {
                const Icon = channelIcon(ch.channel_type);
                return (
                  <CommandItem
                    key={ch.id}
                    value={`channel:${ch.id} ${ch.name}`}
                    onSelect={() => handleSelect(`channel:${ch.id}`)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{ch.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground capitalize">{ch.channel_type}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          <CommandSeparator />

          {/* Tasks */}
          {tasks.length > 0 && (
            <CommandGroup heading="Tarefas Ativas">
              {tasks.map(task => (
                <CommandItem
                  key={task.id}
                  value={`task:${task.id} ${task.title}`}
                  onSelect={() => {
                    setOpen(false);
                    navigate('/tarefas');
                  }}
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  <span className="truncate">{task.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{task.status}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandSeparator />

          {/* Team */}
          {team.length > 0 && (
            <CommandGroup heading="Equipe">
              {team.map(member => (
                <CommandItem
                  key={member.id}
                  value={`team:${member.id} ${member.name}`}
                  onSelect={() => {
                    setOpen(false);
                    navigate('/equipe');
                  }}
                >
                  <Users className="mr-2 h-4 w-4" />
                  <span>{member.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{member.role}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
