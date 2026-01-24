import { ReactNode, useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSyncJobStatus } from "@/hooks/useSyncJobStatus";
import { useClients, Client } from "@/hooks/useClients";
import { ClientDialog } from "@/components/clients/ClientDialog";
import { ClientQuickSwitch } from "@/components/clients/ClientQuickSwitch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  LayoutDashboard,
  Megaphone,
  Layers,
  Image,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Users,
  FileText,
  GitCompare,
  User,
  StickyNote,
  UserX,
  DollarSign,
  Clock,
  Kanban,
  Zap,
  Loader2,
  Share2,
  UsersRound,
  Activity,
  Pencil,
  ArrowLeftRight,
  ListTodo,
  Sparkles,
  Factory,
  Palette,
  ExternalLink,
  Link2,
  ChevronDown,
  ChevronRight,
  LucideIcon,
  Eye,
  Settings,
  Target,
  PenTool,
  Presentation,
} from "lucide-react";

interface ClientDetailsLayoutProps {
  children: ReactNode;
  clientId: string;
  clientName: string;
  dashboardToken?: string | null;
}

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  title: string;
  icon: LucideIcon;
  items: NavItem[];
}

export function ClientDetailsLayout({ children, clientId, clientName, dashboardToken }: ClientDetailsLayoutProps) {
  const location = useLocation();
  const [activeSyncJobId, setActiveSyncJobId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [switchClientOpen, setSwitchClientOpen] = useState(false);
  const { job, progressPercentage } = useSyncJobStatus(activeSyncJobId);
  const { clients, updateClient } = useClients();
  
  // Find the current client from the clients list
  const currentClient = clients.find(c => c.id === clientId);

  // Navigation groups
  const navGroups: NavGroup[] = useMemo(() => [
    {
      title: "Visão Geral",
      icon: Eye,
      items: [
        { title: "Dashboard", href: `/clientes/${clientId}`, icon: LayoutDashboard },
        { title: "Alertas & Sugestões", href: `/clientes/${clientId}/alertas`, icon: AlertTriangle },
      ]
    },
    {
      title: "Análises & Relatórios",
      icon: BarChart3,
      items: [
        { title: "Análise Completa", href: `/clientes/${clientId}/analise`, icon: BarChart3 },
        { title: "Análise Competitiva", href: `/clientes/${clientId}/competitiva`, icon: Users },
        { title: "Comparação de Períodos", href: `/clientes/${clientId}/comparacao`, icon: GitCompare },
        { title: "Relatório Semanal", href: `/clientes/${clientId}/relatorio`, icon: FileText },
        { title: "Tendências", href: `/clientes/${clientId}/tendencias`, icon: TrendingUp },
      ]
    },
    {
      title: "Campanhas & Anúncios",
      icon: Megaphone,
      items: [
        { title: "Campanhas", href: `/clientes/${clientId}/campanhas`, icon: Megaphone },
        { title: "Conjuntos de Anúncios", href: `/clientes/${clientId}/conjuntos`, icon: Layers },
        { title: "Criativos", href: `/clientes/${clientId}/criativos`, icon: Image },
        { title: "Funil de Conversão", href: `/clientes/${clientId}/funil`, icon: TrendingUp },
        { title: "Automações", href: `/clientes/${clientId}/automacoes`, icon: Zap },
      ]
    },
    {
      title: "Meta & Rastreamento",
      icon: Target,
      items: [
        { title: "Pixels Meta", href: `/clientes/${clientId}/pixels`, icon: Activity },
        { title: "Públicos Meta", href: `/clientes/${clientId}/publicos`, icon: UsersRound },
        { title: "Conversões Offline", href: `/clientes/${clientId}/conversoes`, icon: DollarSign },
        { title: "URLs", href: `/clientes/${clientId}/urls`, icon: Link2 },
        { title: "Keyword Planner", href: `/clientes/${clientId}/keyword-planner`, icon: Sparkles },
      ]
    },
    {
      title: "Gestão de Leads",
      icon: Kanban,
      items: [
        { title: "CRM", href: `/clientes/${clientId}/crm`, icon: Kanban },
        { title: "Leads Desqualificados", href: `/clientes/${clientId}/leads-desqualificados`, icon: UserX },
      ]
    },
    {
      title: "Criação de Conteúdo",
      icon: PenTool,
      items: [
        { title: "Fábrica de Anúncios", href: `/clientes/${clientId}/fabrica-anuncios`, icon: Factory },
        { title: "Fábrica de Criativos", href: `/clientes/${clientId}/fabrica-criativos`, icon: Palette },
        { title: "Fábrica de Carrosseis", href: `/clientes/${clientId}/fabrica-carrosseis`, icon: Layers },
        { title: "Redes Sociais", href: `/clientes/${clientId}/redes-sociais`, icon: Share2 },
      ]
    },
    {
      title: "Apresentações & Planejamento",
      icon: Presentation,
      items: [
        { title: "Apresentações", href: `/clientes/${clientId}/apresentacoes`, icon: TrendingUp },
        { title: "Tarefas", href: `/clientes/${clientId}/tarefas`, icon: ListTodo },
      ]
    },
    {
      title: "Configurações & Dados",
      icon: Settings,
      items: [
        { title: "Contato & Dados", href: `/clientes/${clientId}/contato`, icon: User },
        { title: "Anotações", href: `/clientes/${clientId}/anotacoes`, icon: StickyNote },
        { title: "Histórico", href: `/clientes/${clientId}/historico`, icon: Clock },
      ]
    },
  ], [clientId]);

  // State for controlling open groups - initialize with active group + Visão Geral
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    const activeGroup = navGroups.find(group => 
      group.items.some(item => location.pathname === item.href)
    );
    const defaultOpen = ["Visão Geral"];
    if (activeGroup && activeGroup.title !== "Visão Geral") {
      defaultOpen.push(activeGroup.title);
    }
    return defaultOpen;
  });

  // Update open groups when route changes
  useEffect(() => {
    const activeGroup = navGroups.find(group => 
      group.items.some(item => location.pathname === item.href)
    );
    if (activeGroup && !openGroups.includes(activeGroup.title)) {
      setOpenGroups(prev => [...prev, activeGroup.title]);
    }
  }, [location.pathname, navGroups]);

  // Check for active sync jobs for this client
  useEffect(() => {
    const checkActiveSyncJob = async () => {
      const { data } = await supabase
        .from('sync_jobs')
        .select('id, status, created_at')
        .eq('client_id', clientId)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        // Only show sync indicator if job is less than 10 minutes old
        const jobAge = Date.now() - new Date(data.created_at).getTime();
        const tenMinutes = 10 * 60 * 1000;
        
        if (jobAge < tenMinutes) {
          setActiveSyncJobId(data.id);
        } else {
          // Job is too old, likely stuck - mark it as error
          await supabase
            .from('sync_jobs')
            .update({ 
              status: 'error',
              error_message: 'Job timeout - took more than 10 minutes',
              completed_at: new Date().toISOString()
            })
            .eq('id', data.id);
          
          setActiveSyncJobId(null);
        }
      } else {
        setActiveSyncJobId(null);
      }
    };

    if (clientId) {
      checkActiveSyncJob();
      const interval = setInterval(checkActiveSyncJob, 5000);
      return () => clearInterval(interval);
    }
  }, [clientId]);

  const handleEditClient = async (clientData: Omit<Client, "id" | "active_campaigns" | "avg_cpl" | "leads_generated">) => {
    await updateClient(clientId, clientData);
    setEditDialogOpen(false);
    // Dispatch event to refresh client details across the page
    window.dispatchEvent(new CustomEvent('refreshClientDetails'));
  };

  const toggleGroup = (groupTitle: string, open: boolean) => {
    setOpenGroups(prev => 
      open 
        ? [...prev, groupTitle]
        : prev.filter(g => g !== groupTitle)
    );
  };

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <Card className="w-64 h-fit sticky top-4 flex-shrink-0">
        <CardContent className="p-4">
          <div className="mb-4 pb-4 border-b">
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">
              Cliente
            </h3>
            <div className="flex items-center justify-between gap-1">
              <p className="font-medium truncate flex-1" title={clientName}>
                {clientName}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setSwitchClientOpen(true)}
                title="Trocar de cliente"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setEditDialogOpen(true)}
                title="Editar cliente"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
            {job && (job.status === 'processing' || job.status === 'pending') && (
              <Badge variant="outline" className="mt-2 w-full justify-center animate-pulse">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Sincronizando {progressPercentage}%
              </Badge>
            )}
            {dashboardToken && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => window.open(`${window.location.origin}/dashboard-publico/${dashboardToken}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Dashboard Público
              </Button>
            )}
          </div>
          
          <nav className="space-y-1">
            {navGroups.map((group) => {
              const isOpen = openGroups.includes(group.title);
              const hasActiveItem = group.items.some(item => location.pathname === item.href);
              const GroupIcon = group.icon;
              
              return (
                <Collapsible
                  key={group.title}
                  open={isOpen}
                  onOpenChange={(open) => toggleGroup(group.title, open)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors">
                    <div className="flex items-center gap-2">
                      <GroupIcon className={cn(
                        "w-4 h-4",
                        hasActiveItem && "text-primary"
                      )} />
                      <span className={cn(
                        "font-medium",
                        hasActiveItem && "text-primary"
                      )}>
                        {group.title}
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
                      {group.items.map((item) => {
                        const isActive = location.pathname === item.href;
                        const Icon = item.icon;
                        
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            className={cn(
                              "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                              isActive
                                ? "bg-primary text-primary-foreground font-medium"
                                : "hover:bg-muted text-muted-foreground"
                            )}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{item.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </nav>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>

      {/* Edit Client Dialog - Only render when currentClient is loaded */}
      {currentClient && (
        <ClientDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSubmit={handleEditClient}
          client={currentClient}
          title="Editar Cliente"
        />
      )}

      {/* Client Quick Switch Dialog */}
      <ClientQuickSwitch
        open={switchClientOpen}
        onOpenChange={setSwitchClientOpen}
        currentClientId={clientId}
      />
    </div>
  );
}
