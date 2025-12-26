import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSyncJobStatus } from "@/hooks/useSyncJobStatus";
import { useClients, Client } from "@/hooks/useClients";
import { ClientDialog } from "@/components/clients/ClientDialog";
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
  Instagram,
  Pencil,
} from "lucide-react";

interface ClientDetailsLayoutProps {
  children: ReactNode;
  clientId: string;
  clientName: string;
}

export function ClientDetailsLayout({ children, clientId, clientName }: ClientDetailsLayoutProps) {
  const location = useLocation();
  const [activeSyncJobId, setActiveSyncJobId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { job, progressPercentage } = useSyncJobStatus(activeSyncJobId);
  const { clients, updateClient } = useClients();
  
  // Find the current client from the clients list
  const currentClient = clients.find(c => c.id === clientId);

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

  const navItems = [
    {
      title: "Dashboard",
      href: `/clientes/${clientId}`,
      icon: LayoutDashboard,
      description: "Visão geral e métricas principais"
    },
    {
      title: "Alertas & Sugestões",
      href: `/clientes/${clientId}/alertas`,
      icon: AlertTriangle,
      description: "Ver alertas e sugestões"
    },
    {
      title: "Análise Competitiva",
      href: `/clientes/${clientId}/competitiva`,
      icon: Users,
      description: "Comparar com concorrentes"
    },
    {
      title: "Análise Completa",
      href: `/clientes/${clientId}/analise`,
      icon: BarChart3,
      description: "Análise detalhada"
    },
    {
      title: "Anotações",
      href: `/clientes/${clientId}/anotacoes`,
      icon: StickyNote,
      description: "Anotações sobre o cliente"
    },
    {
      title: "Automações",
      href: `/clientes/${clientId}/automacoes`,
      icon: Zap,
      description: "Gerenciar automações"
    },
    {
      title: "Campanhas",
      href: `/clientes/${clientId}/campanhas`,
      icon: Megaphone,
      description: "Gerenciar campanhas ativas"
    },
    {
      title: "Comparação de Períodos",
      href: `/clientes/${clientId}/comparacao`,
      icon: GitCompare,
      description: "Comparar períodos"
    },
    {
      title: "Conjuntos de Anúncios",
      href: `/clientes/${clientId}/conjuntos`,
      icon: Layers,
      description: "Ver conjuntos de anúncios"
    },
    {
      title: "Contato & Dados",
      href: `/clientes/${clientId}/contato`,
      icon: User,
      description: "Informações de contato"
    },
    {
      title: "Conversões Offline",
      href: `/clientes/${clientId}/conversoes`,
      icon: DollarSign,
      description: "Rastrear conversões offline"
    },
    {
      title: "Criativos",
      href: `/clientes/${clientId}/criativos`,
      icon: Image,
      description: "Gerenciar criativos e anúncios"
    },
    {
      title: "CRM",
      href: `/clientes/${clientId}/crm`,
      icon: Kanban,
      description: "Gerenciar leads no mini CRM"
    },
    {
      title: "Funil de Conversão",
      href: `/clientes/${clientId}/funil`,
      icon: TrendingUp,
      description: "Análise do funil de vendas"
    },
    {
      title: "Histórico",
      href: `/clientes/${clientId}/historico`,
      icon: Clock,
      description: "Histórico de alterações"
    },
    {
      title: "Leads Desqualificados",
      href: `/clientes/${clientId}/leads-desqualificados`,
      icon: UserX,
      description: "Gerenciar leads desqualificados"
    },
    {
      title: "Pixels Meta",
      href: `/clientes/${clientId}/pixels`,
      icon: Activity,
      description: "Gerenciar pixels de conversão"
    },
    {
      title: "Públicos Meta",
      href: `/clientes/${clientId}/publicos`,
      icon: UsersRound,
      description: "Gerenciar públicos personalizados"
    },
    {
      title: "Apresentações",
      href: `/clientes/${clientId}/apresentacoes`,
      icon: TrendingUp,
      description: "Apresentações de resultados"
    },
    {
      title: "Redes Sociais",
      href: `/clientes/${clientId}/redes-sociais`,
      icon: Share2,
      description: "Análise de redes sociais"
    },
    {
      title: "Relatório Semanal",
      href: `/clientes/${clientId}/relatorio`,
      icon: FileText,
      description: "Relatórios semanais"
    }
  ];

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <Card className="w-64 h-fit sticky top-4 flex-shrink-0">
        <CardContent className="p-4">
          <div className="mb-4 pb-4 border-b">
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">
              Cliente
            </h3>
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium truncate flex-1" title={clientName}>
                {clientName}
              </p>
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
          </div>
          
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.title}</div>
                  </div>
                </Link>
              );
            })}
          </nav>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>

      {/* Edit Client Dialog */}
      <ClientDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleEditClient}
        client={currentClient}
        title="Editar Cliente"
      />
    </div>
  );
}
