import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { DialogTitle } from "@/components/ui/dialog";
import {
  Search,
  Users,
  Building2,
  CheckSquare,
  Settings,
  BarChart3,
  Zap,
  Home,
  Activity,
  ListChecks,
  LayoutGrid,
  TrendingUp,
  Sparkles,
  Heart,
  Rocket,
  Briefcase,
  Brain,
  Bot,
  GitBranch,
  FileText,
  Wand2,
  CalendarClock,
  MessageSquare,
  RotateCcw,
  Bell,
  UserCheck,
  Megaphone,
  Database,
  NotebookText,
  ImagePlus,
  Puzzle,
  BookOpen,
  Radar,
  Inbox,
  type LucideIcon,
} from "lucide-react";

// All navigable menu items for universal search
const MENU_ITEMS: Array<{
  title: string;
  url: string;
  icon: LucideIcon;
  category: string;
}> = [
  // Visão Geral
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    category: "Visão Geral",
  },
  {
    title: "Radar de Saúde",
    url: "/radar-saude",
    icon: Activity,
    category: "Visão Geral",
  },
  {
    title: "Rotinas Diárias",
    url: "/rotinas",
    icon: ListChecks,
    category: "Visão Geral",
  },
  // Clientes
  { title: "Clientes", url: "/clientes", icon: Users, category: "Clientes" },
  // Customer Success
  {
    title: "CS Cockpit",
    url: "/cs/cockpit",
    icon: Rocket,
    category: "Customer Success",
  },
  {
    title: "CS Carteira",
    url: "/cs/carteira",
    icon: Briefcase,
    category: "Customer Success",
  },
  {
    title: "CS Jornada",
    url: "/cs/jornada",
    icon: TrendingUp,
    category: "Customer Success",
  },
  {
    title: "CS Ações",
    url: "/cs/acoes",
    icon: Zap,
    category: "Customer Success",
  },
  {
    title: "CS Clientes",
    url: "/cs/clientes",
    icon: Users,
    category: "Customer Success",
  },
  {
    title: "GroupOps",
    url: "/cs/groupops",
    icon: MessageSquare,
    category: "Customer Success",
  },
  // Conteúdo & Social
  {
    title: "Agendamento",
    url: "/agendamento",
    icon: CalendarClock,
    category: "Conteúdo & Social",
  },
  {
    title: "Automatizadores",
    url: "/automatizadores",
    icon: Zap,
    category: "Conteúdo & Social",
  },
  {
    title: "Editor de Imagens",
    url: "/editor-imagens",
    icon: ImagePlus,
    category: "Conteúdo & Social",
  },
  {
    title: "Geradores",
    url: "/geradores",
    icon: Wand2,
    category: "Conteúdo & Social",
  },
  {
    title: "Planejador de Conteúdo",
    url: "/geradores/planejamento-conteudo",
    icon: FileText,
    category: "Conteúdo & Social",
  },
  {
    title: "Repositório de Criativos",
    url: "/repositorio-criativos",
    icon: Sparkles,
    category: "Conteúdo & Social",
  },
  {
    title: "YouTube Content Lab",
    url: "/youtube-content-lab",
    icon: Sparkles,
    category: "Conteúdo & Social",
  },
  // Equipe
  {
    title: "Colaboradores",
    url: "/colaboradores",
    icon: UserCheck,
    category: "Equipe",
  },
  {
    title: "Backlog Center",
    url: "/backlog-command-center",
    icon: Inbox,
    category: "Equipe",
  },
  {
    title: "Command Center",
    url: "/squad-command-center",
    icon: Radar,
    category: "Equipe",
  },
  { title: "Histórias", url: "/historias", icon: BookOpen, category: "Equipe" },
  {
    title: "Planner",
    url: "/planner-config",
    icon: CalendarClock,
    category: "Equipe",
  },
  {
    title: "Relatórios Equipe",
    url: "/relatorios",
    icon: BarChart3,
    category: "Equipe",
  },
  { title: "Squad", url: "/squad", icon: Users, category: "Equipe" },
  // Rotina
  {
    title: "Tarefas Diárias",
    url: "/tarefas",
    icon: CheckSquare,
    category: "Rotina",
  },
  {
    title: "Checklists",
    url: "/checklist-templates",
    icon: ListChecks,
    category: "Rotina",
  },
  { title: "Fluxos", url: "/fluxos", icon: GitBranch, category: "Rotina" },
  {
    title: "Mapas Mentais",
    url: "/mapas-mentais",
    icon: Brain,
    category: "Rotina",
  },
  { title: "Roteiros", url: "/roteiros", icon: BookOpen, category: "Rotina" },
  {
    title: "Tarefas Recorrentes",
    url: "/tarefas-recorrentes",
    icon: RotateCcw,
    category: "Rotina",
  },
  {
    title: "Workspace",
    url: "/workspace",
    icon: NotebookText,
    category: "Rotina",
  },
  // IA
  {
    title: "Agentes de IA",
    url: "/ia/agents",
    icon: Bot,
    category: "Inteligência Artificial",
  },
  { title: "IA", url: "/ia", icon: Brain, category: "Inteligência Artificial" },
  {
    title: "Skills",
    url: "/ia/skills",
    icon: Puzzle,
    category: "Inteligência Artificial",
  },
  {
    title: "Squads de IA",
    url: "/ia/squads",
    icon: Users,
    category: "Inteligência Artificial",
  },
  // Marketing
  {
    title: "Automações Marketing",
    url: "/automacoes",
    icon: Zap,
    category: "Marketing & Tráfego",
  },
  {
    title: "Campanhas",
    url: "/campanhas",
    icon: Megaphone,
    category: "Marketing & Tráfego",
  },
  {
    title: "Funis",
    url: "/editor-funil",
    icon: GitBranch,
    category: "Marketing & Tráfego",
  },
  {
    title: "Keyword Planner",
    url: "/keyword-planner",
    icon: Sparkles,
    category: "Marketing & Tráfego",
  },
  {
    title: "Lead Intelligence",
    url: "/lead-intelligence",
    icon: Database,
    category: "Marketing & Tráfego",
  },
  {
    title: "Notificações WhatsApp",
    url: "/notificacoes/whatsapp",
    icon: Bell,
    category: "Marketing & Tráfego",
  },
  {
    title: "Parâmetros de Performance",
    url: "/parametros-performance",
    icon: Activity,
    category: "Marketing & Tráfego",
  },
  {
    title: "Relatórios Marketing",
    url: "/marketing/relatorios",
    icon: BarChart3,
    category: "Marketing & Tráfego",
  },
  // Sistema
  { title: "Alertas", url: "/alertas", icon: Bell, category: "Sistema" },
  {
    title: "Configurações",
    url: "/configuracoes",
    icon: Settings,
    category: "Sistema",
  },
];

export function UniversalCommandBar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;

  // Global keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Fetch clients for search
  const { data: clients = [] } = useQuery({
    queryKey: ["command-clients", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("clients")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name")
        .limit(50);
      return (data || []) as Array<{ id: string; name: string }>;
    },
    enabled: !!companyId && open,
    staleTime: 30_000,
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ["command-tasks-universal", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await (
        supabase
          .from("tasks")
          .select("id, title, status")
          .eq("company_id", companyId) as unknown
      )
        .in("status", ["todo", "progress", "review"])
        .order("updated_at", { ascending: false })
        .limit(10);
      return (data || []) as Array<{
        id: string;
        title: string;
        status: string;
      }>;
    },
    enabled: !!companyId && open,
    staleTime: 30_000,
  });

  // Fetch team
  const { data: team = [] } = useQuery({
    queryKey: ["command-team-universal", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await (
        supabase
          .from("employees")
          .select("id, name, role")
          .eq("company_id", companyId) as unknown
      )
        .eq("is_active", true)
        .limit(10);
      return (data || []) as Array<{ id: string; name: string; role: string }>;
    },
    enabled: !!companyId && open,
    staleTime: 60_000,
  });

  const handleSelect = useCallback(
    (value: string) => {
      setOpen(false);
      if (value.startsWith("client:")) {
        navigate(`/clientes/${value.replace("client:", "")}`);
      } else if (value.startsWith("nav:")) {
        navigate(value.replace("nav:", ""));
      } else if (value.startsWith("task:")) {
        navigate("/tarefas");
      } else if (value.startsWith("team:")) {
        navigate("/colaboradores");
      }
    },
    [navigate],
  );

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/40 text-muted-foreground text-sm hover:bg-accent/50 transition-colors w-64"
      >
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 text-left truncate">Buscar...</span>
        <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <DialogTitle className="sr-only">Barra de Comandos</DialogTitle>
        <CommandInput placeholder="Buscar clientes, menus, tarefas, pessoas..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

          {/* Clients */}
          {clients.length > 0 && (
            <>
              <CommandGroup heading="Clientes">
                {clients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={`client:${client.id} ${client.name}`}
                    onSelect={() => handleSelect(`client:${client.id}`)}
                  >
                    <Building2 className="mr-2 h-4 w-4 text-primary" />
                    <span>{client.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      Ver detalhes
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Menu Navigation */}
          <CommandGroup heading="Navegação">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.url}
                  value={`nav:${item.url} ${item.title} ${item.category}`}
                  onSelect={() => handleSelect(`nav:${item.url}`)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{item.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {item.category}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />

          {/* Tasks */}
          {tasks.length > 0 && (
            <>
              <CommandGroup heading="Tarefas Ativas">
                {tasks.map((task) => (
                  <CommandItem
                    key={task.id}
                    value={`task:${task.id} ${task.title}`}
                    onSelect={() => handleSelect(`task:${task.id}`)}
                  >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    <span className="truncate">{task.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {task.status}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Team */}
          {team.length > 0 && (
            <CommandGroup heading="Equipe">
              {team.map((member) => (
                <CommandItem
                  key={member.id}
                  value={`team:${member.id} ${member.name}`}
                  onSelect={() => handleSelect(`team:${member.id}`)}
                >
                  <Users className="mr-2 h-4 w-4" />
                  <span>{member.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {member.role}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
