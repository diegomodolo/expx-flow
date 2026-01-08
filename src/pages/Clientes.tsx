import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Client, ClientStatus } from "@/hooks/useClients";
import { useClients } from "@/hooks/useClients";
import { useSectors } from "@/hooks/useSectors";
import { useTeams } from "@/hooks/useTeams";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import { ClientDialog } from "@/components/clients/ClientDialog";
import { DeleteClientDialog } from "@/components/clients/DeleteClientDialog";
import { useFacebookCampaignSync } from "@/hooks/useFacebookCampaignSync";
import { useGoogleAdsCampaignSync } from "@/hooks/useGoogleAdsCampaignSync";
import { UnifiedSyncDialog } from "@/components/clients/UnifiedSyncDialog";
import { SyncProgressModal } from "@/components/clients/SyncProgressModal";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  XCircle,
  BarChart,
  Ban,
  PauseCircle
} from "lucide-react";
import { FundingAlert } from "@/components/alerts/FundingAlert";

type StatusType = "all" | ClientStatus;
type ClientFilter = "active" | "paused" | "canceled" | "all";
type RestrictionFilter = "all" | "restricted" | "not_restricted";

// Helper to check if client has account restriction
const isAccountRestricted = (client: Client): boolean => {
  if (!client.facebook_ad_accounts) return false;
  const { can_advertise, is_restricted, account_status } = client.facebook_ad_accounts;
  return can_advertise === false || 
         is_restricted === true || 
         [2, 3, 7, 8, 100, 101].includes(account_status);
};

const statusConfig = {
  excelente: { 
    label: "Excelente", 
    color: "bg-status-excellent/10 text-status-excellent border-status-excellent/20", 
    dotColor: "bg-status-excellent",
    filterDotColor: "bg-status-excellent"
  },
  atencao: { 
    label: "Atenção", 
    color: "bg-status-attention/10 text-status-attention border-status-attention/20", 
    dotColor: "bg-status-attention",
    filterDotColor: "bg-status-attention"
  },
  emergencial: { 
    label: "Emergencial", 
    color: "bg-status-emergency/10 text-status-emergency border-status-emergency/20", 
    dotColor: "bg-status-emergency",
    filterDotColor: "bg-status-emergency"
  },
  sem_fundos: { 
    label: "Sem Fundos", 
    color: "bg-orange-50 text-orange-700 border-orange-200", 
    dotColor: "bg-orange-500",
    filterDotColor: "bg-orange-500"
  },
  inativo: { 
    label: "Inativo", 
    color: "bg-status-inactive/10 text-status-inactive border-status-inactive/20", 
    dotColor: "bg-status-inactive",
    filterDotColor: "bg-status-inactive"
  },
  pausado: { 
    label: "Pausado", 
    color: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800", 
    dotColor: "bg-yellow-500",
    filterDotColor: "bg-yellow-500"
  },
  cancelado: { 
    label: "Cancelado", 
    color: "bg-destructive/10 text-destructive border-destructive/20", 
    dotColor: "bg-destructive",
    filterDotColor: "bg-destructive"
  },
};

type SortField = 'name' | 'status' | 'active_campaigns' | 'avg_cpl' | 'conversions' | 'monthly_budget' | 'spend' | 'balance';
type SortDirection = 'asc' | 'desc';

// Função para gerar a explicação do status baseada nas métricas do cliente
const getStatusExplanation = (client: Client): string => {
  // Use the explanation calculated by the automatic status function
  return (client as any).statusExplanation || "Status calculado automaticamente baseado nas métricas de campanhas.";
};

// Função para obter a configuração do status com fallback
const getStatusConfig = (status: ClientStatus | undefined) => {
  if (!status || !statusConfig[status]) {
    return statusConfig.atencao; // Fallback padrão
  }
  return statusConfig[status];
};

// Função para obter o status visual do cliente (considera pausado/cancelado primeiro)
const getClientVisualStatus = (client: Client): keyof typeof statusConfig => {
  if (client.is_canceled) return "cancelado";
  if ((client as any).is_paused) return "pausado";
  return client.status || "atencao";
};

// Função para calcular se o gasto está dentro do orçamento proporcional
const getBudgetStatus = (client: Client): {
  status: 'ok' | 'warning' | 'over' | 'no-budget';
  percentage: number;
  expectedSpend: number;
} => {
  // Use consolidated budget if available
  const monthlyBudget = client.consolidated_budget || client.monthly_budget || 0;
  const syncPeriod = parseInt(client.last_sync_period || '0');
  const actualSpend = client.consolidated_spend || client.spend || 0;
  
  // Se não tem orçamento configurado, retorna status especial
  if (monthlyBudget === 0) {
    return { status: 'no-budget', percentage: 0, expectedSpend: 0 };
  }
  
  // Se não tem período de sincronização, não pode calcular
  if (syncPeriod === 0) {
    return { status: 'no-budget', percentage: 0, expectedSpend: 0 };
  }
  
  // Calcula gasto esperado proporcional ao período sincronizado
  const expectedSpend = (monthlyBudget / 30) * syncPeriod;
  
  // Calcula porcentagem de utilização
  const percentage = (actualSpend / expectedSpend) * 100;
  
  // Define status baseado na porcentagem
  if (percentage <= 90) {
    return { status: 'ok', percentage, expectedSpend };
  } else if (percentage <= 100) {
    return { status: 'warning', percentage, expectedSpend };
  } else {
    return { status: 'over', percentage, expectedSpend };
  }
};

// Componente para renderizar o ícone de status do orçamento
const BudgetStatusIcon = ({ client }: { client: Client }) => {
  const budgetStatus = getBudgetStatus(client);
  
  if (budgetStatus.status === 'no-budget') {
    return null; // Não mostra ícone se não tem orçamento configurado
  }
  
  const icons = {
    ok: {
      icon: CheckCircle2,
      color: 'text-green-500',
      tooltip: `Gasto dentro do esperado (${budgetStatus.percentage.toFixed(0)}% de R$ ${budgetStatus.expectedSpend.toFixed(2)})`
    },
    warning: {
      icon: AlertCircle,
      color: 'text-yellow-500',
      tooltip: `Atenção: Gasto próximo ao limite (${budgetStatus.percentage.toFixed(0)}% de R$ ${budgetStatus.expectedSpend.toFixed(2)})`
    },
    over: {
      icon: XCircle,
      color: 'text-red-500',
      tooltip: `Alerta: Gasto acima do planejado (${budgetStatus.percentage.toFixed(0)}% de R$ ${budgetStatus.expectedSpend.toFixed(2)})`
    }
  };
  
  const config = icons[budgetStatus.status];
  const Icon = config.icon;
  
  return (
    <Tooltip>
      <TooltipTrigger>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-sm">{config.tooltip}</p>
        <p className="text-xs text-muted-foreground/80 mt-1">
          Período: {client.last_sync_period} dias
        </p>
      </TooltipContent>
    </Tooltip>
  );
};

// Função para calcular se o saldo é suficiente até o próximo dia de recarga
const getBalanceSufficiency = (client: Client): {
  status: 'sufficient' | 'tight' | 'insufficient' | 'no-data';
  balance: number;
  projectedSpend: number;
  daysRemaining: number;
  dailySpend: number;
  nextRechargeDate: Date | null;
  usesFallback: boolean;
} => {
  const balance = client.facebook_ad_accounts?.balance || 0;
  const syncPeriod = parseInt(client.last_sync_period || '0');
  const actualSpend = client.spend || 0;
  const rechargeDay = client.facebook_ad_accounts?.recharge_day;
  
  // Se não tem dados suficientes, retorna status especial
  if (syncPeriod === 0 || actualSpend === 0 || balance === 0) {
    return { 
      status: 'no-data', 
      balance: 0, 
      projectedSpend: 0, 
      daysRemaining: 0,
      dailySpend: 0,
      nextRechargeDate: null,
      usesFallback: false
    };
  }
  
  // Calcular gasto médio diário
  const dailySpend = actualSpend / syncPeriod;
  
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  let nextRechargeDate: Date;
  let usesFallback = false;
  
  // Se tem dia de recarga configurado, usar ele
  if (rechargeDay && rechargeDay >= 1 && rechargeDay <= 31) {
    // Verificar se o próximo dia de recarga é no mesmo mês ou próximo mês
    if (currentDay < rechargeDay) {
      // Próximo recharge é ainda neste mês
      nextRechargeDate = new Date(currentYear, currentMonth, rechargeDay);
    } else {
      // Próximo recharge é no próximo mês
      nextRechargeDate = new Date(currentYear, currentMonth + 1, rechargeDay);
    }
    
    // Ajustar se o dia for maior que os dias do mês
    const maxDayInMonth = new Date(nextRechargeDate.getFullYear(), nextRechargeDate.getMonth() + 1, 0).getDate();
    if (rechargeDay > maxDayInMonth) {
      nextRechargeDate = new Date(nextRechargeDate.getFullYear(), nextRechargeDate.getMonth(), maxDayInMonth);
    }
  } else {
    // Fallback: usar último dia do mês atual
    nextRechargeDate = new Date(currentYear, currentMonth + 1, 0);
    usesFallback = true;
  }
  
  // Calcular dias restantes
  const timeDiff = nextRechargeDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  
  // Se dias restantes <= 0 (não deveria acontecer, mas por segurança)
  if (daysRemaining <= 0) {
    return { 
      status: 'no-data', 
      balance, 
      projectedSpend: 0, 
      daysRemaining: 0,
      dailySpend,
      nextRechargeDate: null,
      usesFallback
    };
  }
  
  // Calcular gasto projetado até o dia de recarga
  const projectedSpend = dailySpend * daysRemaining;
  
  // Calcular porcentagem de cobertura
  const coveragePercentage = (balance / projectedSpend) * 100;
  
  // Define status baseado na cobertura
  let status: 'sufficient' | 'tight' | 'insufficient';
  if (coveragePercentage >= 100) {
    status = 'sufficient';
  } else if (coveragePercentage >= 80) {
    status = 'tight';
  } else {
    status = 'insufficient';
  }
  
  return { status, balance, projectedSpend, daysRemaining, dailySpend, nextRechargeDate, usesFallback };
};

// Componente para renderizar o ícone de suficiência do saldo
const BalanceSufficiencyIcon = ({ client }: { client: Client }) => {
  // Não mostrar para clientes pós-pagos
  if (client.payment_type === 'postpaid') {
    return null;
  }
  
  const sufficiency = getBalanceSufficiency(client);
  
  if (sufficiency.status === 'no-data') {
    return null;
  }
  
  const icons = {
    sufficient: {
      icon: CheckCircle2,
      color: 'text-green-500',
      tooltip: `Saldo suficiente até o dia de recarga`
    },
    tight: {
      icon: AlertCircle,
      color: 'text-yellow-500',
      tooltip: `Atenção: Saldo pode não durar até o dia de recarga`
    },
    insufficient: {
      icon: XCircle,
      color: 'text-red-500',
      tooltip: `Alerta: Saldo insuficiente até o dia de recarga`
    }
  };
  
  const config = icons[sufficiency.status];
  const Icon = config.icon;
  
  // Formatar data do próximo dia de recarga
  const rechargeDateStr = sufficiency.nextRechargeDate 
    ? sufficiency.nextRechargeDate.toLocaleDateString('pt-BR')
    : 'N/A';
  
  return (
    <Tooltip>
      <TooltipTrigger>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-sm font-medium">{config.tooltip}</p>
        <div className="mt-2 space-y-1 text-xs">
          <p>
            <span className="text-muted-foreground">Próxima recarga:</span>{' '}
            <span className="font-medium">{rechargeDateStr}</span>
            {sufficiency.usesFallback && (
              <span className="text-yellow-500 ml-1">(padrão: fim do mês)</span>
            )}
          </p>
          <p><span className="text-muted-foreground">Saldo atual:</span> <span className="font-medium">R$ {sufficiency.balance.toFixed(2)}</span></p>
          <p><span className="text-muted-foreground">Gasto médio/dia:</span> <span className="font-medium">R$ {sufficiency.dailySpend.toFixed(2)}</span></p>
          <p><span className="text-muted-foreground">Dias restantes:</span> <span className="font-medium">{sufficiency.daysRemaining} dias</span></p>
          <p><span className="text-muted-foreground">Gasto projetado:</span> <span className="font-medium">R$ {sufficiency.projectedSpend.toFixed(2)}</span></p>
        </div>
        <p className="text-xs text-muted-foreground/80 mt-2">
          Baseado em {client.last_sync_period} dias de dados
        </p>
      </TooltipContent>
    </Tooltip>
  );
};

const Clientes = () => {
  const [clientFilter, setClientFilter] = useState<ClientFilter>("active");
  const [statusFilter, setStatusFilter] = useState<StatusType>("all");
  const [restrictionFilter, setRestrictionFilter] = useState<RestrictionFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    sector: "all",
    budgetRange: "all",
    campaignRange: "all",
    squad: "all"
  });
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [recalculating, setRecalculating] = useState(false);
  const { clients, loading, error, createClient, updateClient, deleteClient, fetchClients, recalculateAllStatus, recalculatingProgress } = useClients({ includeCanceled: clientFilter === "canceled" || clientFilter === "all" });
  const { sectors, fetchSectors } = useSectors();
  const { teams } = useTeams();
  const { syncing: syncingMeta, progress: metaProgress } = useFacebookCampaignSync();
  const { syncing: syncingGoogle, progress: googleProgress } = useGoogleAdsCampaignSync();
  const { activeCompany } = useCompany();
  const syncing = syncingMeta || syncingGoogle;
  const progress = syncingMeta ? metaProgress : googleProgress;
  const { toast } = useToast();
  
  // Usar valor fixo maior para aproveitar melhor a tela
  const itemsPerPage = 12;

  // Memoized handlers to prevent re-renders
  const handleAddClient = () => {
    setDialogMode('create');
    setSelectedClient(null);
    setDialogOpen(true);
  };

  const handleApplyFilters = () => {
    toast({
      title: "Filtros aplicados",
      description: `${filteredAndSortedClients.length} clientes encontrados.`,
    });
  };

  const handleRecalculateStatus = async () => {
    setRecalculating(true);
    
    try {
      const result = await recalculateAllStatus();
      
      if (result.success) {
        toast({
          title: "Status recalculados",
          description: `${result.count} clientes tiveram seus status atualizados com base nas regras configuradas.`,
        });
      } else {
        toast({
          title: "Erro ao recalcular",
          description: "Não foi possível recalcular os status. Tente novamente.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao recalcular os status.",
        variant: "destructive",
      });
    } finally {
      setRecalculating(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const filteredAndSortedClients = clients.filter(client => {
    // Filter by client status (active, paused, canceled)
    const matchesClientFilter = (() => {
      if (clientFilter === "all") return true;
      if (clientFilter === "canceled") return client.is_canceled === true;
      if (clientFilter === "paused") return (client as any).is_paused === true && !client.is_canceled;
      // "active" = not paused and not canceled
      return !(client as any).is_paused && !client.is_canceled;
    })();
    
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.company.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSector = filters.sector === "all" || client.sector === filters.sector;
    
    const matchesBudget = filters.budgetRange === "all" || (() => {
      const budget = client.monthly_budget || 0;
      switch (filters.budgetRange) {
        case "0-1000": return budget >= 0 && budget <= 1000;
        case "1000-5000": return budget > 1000 && budget <= 5000;
        case "5000-10000": return budget > 5000 && budget <= 10000;
        case "10000+": return budget > 10000;
        default: return true;
      }
    })();
    
    const matchesCampaigns = filters.campaignRange === "all" || (() => {
      const campaigns = client.active_campaigns || 0;
      switch (filters.campaignRange) {
        case "0": return campaigns === 0;
        case "1-3": return campaigns >= 1 && campaigns <= 3;
        case "4-10": return campaigns >= 4 && campaigns <= 10;
        case "10+": return campaigns > 10;
        default: return true;
      }
    })();

    const matchesSquad = filters.squad === "all" || (() => {
      if (filters.squad === "none") {
        return !client.team_id;
      }
      return client.team_id === filters.squad;
    })();

    const matchesRestriction = restrictionFilter === "all" || (() => {
      const hasRestriction = isAccountRestricted(client);
      if (restrictionFilter === "restricted") return hasRestriction;
      return !hasRestriction;
    })();
    
    return matchesClientFilter && matchesStatus && matchesSearch && matchesSector && matchesBudget && matchesCampaigns && matchesSquad && matchesRestriction;
  }).sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    // Handle status field specially for emergency order
    if (sortField === 'status') {
      const statusOrder = { emergencial: 4, sem_fundos: 3, atencao: 2, excelente: 1, inativo: 0 };
      aValue = statusOrder[a.status];
      bValue = statusOrder[b.status];
    }
    
    // Handle spend field (use consolidated)
    if (sortField === 'spend') {
      aValue = a.consolidated_spend || a.spend || 0;
      bValue = b.consolidated_spend || b.spend || 0;
    }
    
    // Handle conversions field (use consolidated)
    if (sortField === 'conversions') {
      aValue = a.consolidated_conversions || a.leads_generated || 0;
      bValue = b.consolidated_conversions || b.leads_generated || 0;
    }
    
    // Handle monthly_budget field (use consolidated)
    if (sortField === 'monthly_budget') {
      aValue = a.consolidated_budget || a.monthly_budget || 0;
      bValue = b.consolidated_budget || b.monthly_budget || 0;
    }
    
    // Handle balance field
    if (sortField === 'balance') {
      aValue = a.facebook_ad_accounts?.balance || 0;
      bValue = b.facebook_ad_accounts?.balance || 0;
    }

    // Handle null/undefined values
    if (aValue == null) aValue = 0;
    if (bValue == null) bValue = 0;

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const totalClients = filteredAndSortedClients.length;
  const totalPages = Math.ceil(totalClients / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredAndSortedClients.slice(startIndex, startIndex + itemsPerPage);
  
  // Reset da página quando os filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, filters.sector, filters.budgetRange, filters.campaignRange, filters.squad]);

  
  const exportToCSV = () => {
    const headers = [
      "Nome", "Email", "Empresa", "Setor", "Status", "Plataformas",
      "Campanhas Ativas", "Campanhas Meta", "Campanhas Google",
      "CPA Médio", "Conversões", "Conversões Meta", "Conversões Google",
      "Orçamento Total", "Orçamento Meta", "Orçamento Google",
      "Gasto Total", "Gasto Meta", "Gasto Google", "Saldo"
    ];
    const csvData = filteredAndSortedClients.map(client => {
      const platforms = [
        client.has_meta ? 'Meta' : '',
        client.has_google ? 'Google' : ''
      ].filter(Boolean).join(', ') || '-';
      
      return [
        client.name,
        client.email,
        client.company,
        client.sector,
        statusConfig[getClientVisualStatus(client)].label,
        platforms,
        client.consolidated_active_campaigns || client.active_campaigns || 0,
        client.meta_active_campaigns || 0,
        client.google_active_campaigns || 0,
        `R$ ${(client.consolidated_cpa || client.avg_cpl || 0).toFixed(2)}`,
        client.consolidated_conversions || client.leads_generated || 0,
        client.meta_conversions || 0,
        client.google_conversions || 0,
        `R$ ${(client.consolidated_budget || client.monthly_budget || 0).toFixed(2)}`,
        `R$ ${(client.meta_monthly_budget || 0).toFixed(2)}`,
        `R$ ${(client.google_monthly_budget || 0).toFixed(2)}`,
        `R$ ${(client.consolidated_spend || client.spend || 0).toFixed(2)}`,
        `R$ ${(client.meta_spend || 0).toFixed(2)}`,
        `R$ ${(client.google_spend || 0).toFixed(2)}`,
        client.facebook_ad_accounts?.balance !== undefined ? `R$ ${client.facebook_ad_accounts.balance.toFixed(2)}` : '-'
      ];
    });
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(","))
      .join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `clientes-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Exportação concluída",
      description: "Lista de clientes exportada com sucesso!",
    });
  };

  useEffect(() => {
    if (error) {
      toast({
        title: "Erro",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Calculate status statistics (including paused and restricted)
  const statusStats = React.useMemo(() => {
    // Note: use clients (not filtered) for pausados/restritas to show total counts
    const allActiveClients = clients.filter(c => !c.is_canceled);
    
    const stats = {
      excelente: filteredAndSortedClients.filter(client => client.status === 'excelente').length,
      atencao: filteredAndSortedClients.filter(client => client.status === 'atencao').length,
      emergencial: filteredAndSortedClients.filter(client => client.status === 'emergencial').length,
      sem_fundos: filteredAndSortedClients.filter(client => client.status === 'sem_fundos').length,
      inativo: filteredAndSortedClients.filter(client => client.status === 'inativo').length,
      pausados: allActiveClients.filter(client => (client as any).is_paused === true).length,
      restritas: allActiveClients.filter(client => isAccountRestricted(client)).length,
    };
    
    const total = totalClients || 1; // Avoid division by zero
    const totalActive = allActiveClients.length || 1;
    
    return {
      excelente: { count: stats.excelente, percentage: (stats.excelente / total) * 100 },
      atencao: { count: stats.atencao, percentage: (stats.atencao / total) * 100 },
      emergencial: { count: stats.emergencial, percentage: (stats.emergencial / total) * 100 },
      sem_fundos: { count: stats.sem_fundos, percentage: (stats.sem_fundos / total) * 100 },
      inativo: { count: stats.inativo, percentage: (stats.inativo / total) * 100 },
      pausados: { count: stats.pausados, percentage: (stats.pausados / totalActive) * 100 },
      restritas: { count: stats.restritas, percentage: (stats.restritas / totalActive) * 100 },
    };
  }, [clients, filteredAndSortedClients, totalClients]);

  return (
    <DashboardLayout>
      <TooltipProvider delayDuration={300}>
        <div className="flex flex-col h-full space-y-3 sm:space-y-4 p-2 sm:p-4">
        {loading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Carregando clientes...</span>
          </div>
        )}
        
        {!loading && (
          <>
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl sm:text-2xl font-bold text-card-foreground">Gerenciar Clientes</h2>
                <Badge variant="secondary" className="px-3 py-1">
                  {totalClients} clientes
                </Badge>
              </div>
              <Button className="flex items-center space-x-2 w-full sm:w-auto" onClick={handleAddClient}>
                <Plus className="w-4 h-4" />
                <span>Adicionar Cliente</span>
              </Button>
            </div>

            {/* Status Statistics Cards - Compact */}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {/* Excelente */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('excelente')}>
                <CardContent className="p-2 sm:p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 bg-status-excellent rounded-full"></div>
                    <span className="text-xs font-medium text-muted-foreground truncate">Excelente</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-status-excellent">{statusStats.excelente.count}</div>
                  <div className="w-full bg-muted rounded-full h-1 mt-1">
                    <div className="bg-status-excellent h-1 rounded-full" style={{ width: `${statusStats.excelente.percentage}%` }}></div>
                  </div>
                </CardContent>
              </Card>

              {/* Atenção */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('atencao')}>
                <CardContent className="p-2 sm:p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 bg-status-attention rounded-full"></div>
                    <span className="text-xs font-medium text-muted-foreground truncate">Atenção</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-status-attention">{statusStats.atencao.count}</div>
                  <div className="w-full bg-muted rounded-full h-1 mt-1">
                    <div className="bg-status-attention h-1 rounded-full" style={{ width: `${statusStats.atencao.percentage}%` }}></div>
                  </div>
                </CardContent>
              </Card>

              {/* Emergencial */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('emergencial')}>
                <CardContent className="p-2 sm:p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 bg-status-emergency rounded-full"></div>
                    <span className="text-xs font-medium text-muted-foreground truncate">Emergencial</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-status-emergency">{statusStats.emergencial.count}</div>
                  <div className="w-full bg-muted rounded-full h-1 mt-1">
                    <div className="bg-status-emergency h-1 rounded-full" style={{ width: `${statusStats.emergencial.percentage}%` }}></div>
                  </div>
                </CardContent>
              </Card>

              {/* Sem Fundos */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('sem_fundos')}>
                <CardContent className="p-2 sm:p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-xs font-medium text-muted-foreground truncate">Sem Fundos</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-orange-600">{statusStats.sem_fundos.count}</div>
                  <div className="w-full bg-muted rounded-full h-1 mt-1">
                    <div className="bg-orange-500 h-1 rounded-full" style={{ width: `${statusStats.sem_fundos.percentage}%` }}></div>
                  </div>
                </CardContent>
              </Card>

              {/* Inativo */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('inativo')}>
                <CardContent className="p-2 sm:p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 bg-status-inactive rounded-full"></div>
                    <span className="text-xs font-medium text-muted-foreground truncate">Inativo</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-status-inactive">{statusStats.inativo.count}</div>
                  <div className="w-full bg-muted rounded-full h-1 mt-1">
                    <div className="bg-status-inactive h-1 rounded-full" style={{ width: `${statusStats.inativo.percentage}%` }}></div>
                  </div>
                </CardContent>
              </Card>

              {/* Pausados */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setClientFilter('paused')}>
                <CardContent className="p-2 sm:p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <PauseCircle className="w-2.5 h-2.5 text-yellow-500" />
                    <span className="text-xs font-medium text-muted-foreground truncate">Pausados</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-yellow-600">{statusStats.pausados.count}</div>
                  <div className="w-full bg-muted rounded-full h-1 mt-1">
                    <div className="bg-yellow-500 h-1 rounded-full" style={{ width: `${statusStats.pausados.percentage}%` }}></div>
                  </div>
                </CardContent>
              </Card>

              {/* Restritas */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setRestrictionFilter('restricted')}>
                <CardContent className="p-2 sm:p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Ban className="w-2.5 h-2.5 text-zinc-700 dark:text-zinc-300" />
                    <span className="text-xs font-medium text-muted-foreground truncate">Restritas</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-zinc-700 dark:text-zinc-300">{statusStats.restritas.count}</div>
                  <div className="w-full bg-muted rounded-full h-1 mt-1">
                    <div className="bg-zinc-700 dark:bg-zinc-400 h-1 rounded-full" style={{ width: `${statusStats.restritas.percentage}%` }}></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Search - Compact Single Line */}
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="space-y-3">
                  {/* Single Line: All controls compact */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Search Input - Compact */}
                    <div className="relative flex-1 min-w-[180px] max-w-[240px]">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-8 text-sm"
                      />
                    </div>

                    {/* Filter Button - Compact */}
                    <Button 
                      variant={showFilters ? "default" : "outline"} 
                      size="sm"
                      className="h-8"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Filter className="w-4 h-4 mr-1" />
                      Filtros
                    </Button>

                    {/* Status Filter Dropdown */}
                    <Select 
                      value={statusFilter} 
                      onValueChange={(value) => setStatusFilter(value as StatusType)}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-sm">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="excelente">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-status-excellent rounded-full"></div>
                            Excelente
                          </div>
                        </SelectItem>
                        <SelectItem value="atencao">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-status-attention rounded-full"></div>
                            Atenção
                          </div>
                        </SelectItem>
                        <SelectItem value="emergencial">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-status-emergency rounded-full"></div>
                            Emergencial
                          </div>
                        </SelectItem>
                        <SelectItem value="sem_fundos">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            Sem Fundos
                          </div>
                        </SelectItem>
                        <SelectItem value="inativo">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-status-inactive rounded-full"></div>
                            Inativo
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Client State Filter Dropdown */}
                    <Select 
                      value={clientFilter} 
                      onValueChange={(value) => setClientFilter(value as ClientFilter)}
                    >
                      <SelectTrigger className="w-[120px] h-8 text-sm">
                        <SelectValue placeholder="Clientes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Ativos</SelectItem>
                        <SelectItem value="paused">
                          <div className="flex items-center gap-2">
                            <PauseCircle className="w-3 h-3 text-yellow-600" />
                            Pausados
                          </div>
                        </SelectItem>
                        <SelectItem value="canceled">
                          <div className="flex items-center gap-2">
                            <Ban className="w-3 h-3 text-destructive" />
                            Cancelados
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Restriction Filter Dropdown */}
                    <Select 
                      value={restrictionFilter} 
                      onValueChange={(value) => setRestrictionFilter(value as RestrictionFilter)}
                    >
                      <SelectTrigger className="w-[130px] h-8 text-sm">
                        <SelectValue placeholder="Restrições" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas contas</SelectItem>
                        <SelectItem value="restricted">
                          <div className="flex items-center gap-2">
                            <Ban className="w-3 h-3" />
                            Restritas
                          </div>
                        </SelectItem>
                        <SelectItem value="not_restricted">Sem restrição</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Clear filters button */}
                    {(statusFilter !== "all" || clientFilter !== "active" || restrictionFilter !== "all") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setStatusFilter("all");
                          setClientFilter("active");
                          setRestrictionFilter("all");
                        }}
                      >
                        Limpar
                      </Button>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Actions Menu - Three dots */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border shadow-lg z-50">
                        <DropdownMenuItem 
                          onClick={() => setSyncDialogOpen(true)}
                          disabled={syncing}
                          className="cursor-pointer"
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                          Sincronizar Meta
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={handleRecalculateStatus}
                          disabled={loading || recalculating}
                          className="cursor-pointer"
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${recalculating ? 'animate-spin' : ''}`} />
                          Reaplicar Status
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={exportToCSV}
                          className="cursor-pointer"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Exportar Clientes
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Filters Card */}
            {showFilters && (
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <h3 className="text-lg font-semibold mb-4">Filtros Avançados</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sector-filter">Setor</Label>
                      <Select 
                        value={filters.sector} 
                        onValueChange={(value) => setFilters({ ...filters, sector: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os setores" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os setores</SelectItem>
                          {sectors.map((sector) => (
                            <SelectItem key={sector.id} value={sector.name}>
                              {sector.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="squad-filter">Squad</Label>
                      <Select 
                        value={filters.squad} 
                        onValueChange={(value) => setFilters({ ...filters, squad: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas as squads" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as squads</SelectItem>
                          <SelectItem value="none">Sem squad</SelectItem>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: team.color }}
                                />
                                {team.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="budget-filter">Orçamento Mensal</Label>
                      <Select 
                        value={filters.budgetRange} 
                        onValueChange={(value) => setFilters({ ...filters, budgetRange: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas as faixas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as faixas</SelectItem>
                          <SelectItem value="0-1000">R$ 0 - R$ 1.000</SelectItem>
                          <SelectItem value="1000-5000">R$ 1.000 - R$ 5.000</SelectItem>
                          <SelectItem value="5000-10000">R$ 5.000 - R$ 10.000</SelectItem>
                          <SelectItem value="10000+">R$ 10.000+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="campaigns-filter">Campanhas Ativas</Label>
                      <Select 
                        value={filters.campaignRange} 
                        onValueChange={(value) => setFilters({ ...filters, campaignRange: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Qualquer quantidade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Qualquer quantidade</SelectItem>
                          <SelectItem value="0">0 campanhas</SelectItem>
                          <SelectItem value="1-3">1-3 campanhas</SelectItem>
                          <SelectItem value="4-10">4-10 campanhas</SelectItem>
                          <SelectItem value="10+">10+ campanhas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 mt-4">
                    <Button 
                      variant="outline" 
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setFilters({ sector: "all", budgetRange: "all", campaignRange: "all", squad: "all" });
                        toast({
                          title: "Filtros limpos",
                          description: "Todos os filtros foram removidos.",
                        });
                      }}
                    >
                      Limpar Filtros
                    </Button>
                     <Button onClick={handleApplyFilters} className="w-full sm:w-auto">
                       Aplicar ({filteredAndSortedClients.length})
                     </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Clients Table - Desktop */}
            <div className="hidden sm:block">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                     <table className="w-full">
                       <thead className="bg-muted/30">
                         <tr>
                           <th 
                             className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 transition-colors"
                             onClick={() => handleSort('name')}
                           >
                             <div className="flex items-center space-x-1">
                               <span>Cliente</span>
                               {getSortIcon('name')}
                             </div>
                           </th>
                           <th 
                             className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 transition-colors"
                             onClick={() => handleSort('status')}
                           >
                             <div className="flex items-center space-x-1">
                               <span>Status</span>
                               {getSortIcon('status')}
                             </div>
                           </th>
                           <th 
                             className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 transition-colors"
                             onClick={() => handleSort('active_campaigns')}
                           >
                             <div className="flex items-center space-x-1">
                               <span>Campanhas</span>
                               {getSortIcon('active_campaigns')}
                             </div>
                           </th>
                           <th 
                             className="hidden lg:table-cell px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 transition-colors"
                             onClick={() => handleSort('avg_cpl')}
                           >
                             <div className="flex items-center space-x-1">
                               <span>CPL Médio</span>
                               {getSortIcon('avg_cpl')}
                             </div>
                           </th>
                           <th 
                             className="hidden xl:table-cell px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 transition-colors"
                             onClick={() => handleSort('conversions')}
                           >
                             <div className="flex items-center space-x-1">
                               <span>Conversões</span>
                               {getSortIcon('conversions')}
                             </div>
                           </th>
                           <th 
                             className="hidden xl:table-cell px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 transition-colors"
                             onClick={() => handleSort('monthly_budget')}
                           >
                             <div className="flex items-center space-x-1">
                               <span>Orçamento</span>
                               {getSortIcon('monthly_budget')}
                             </div>
                           </th>
                            <th 
                              className="hidden 2xl:table-cell px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => handleSort('spend')}
                            >
                              <div className="flex items-center space-x-1">
                                <span>Gasto</span>
                                {getSortIcon('spend')}
                              </div>
                            </th>
                            <th 
                              className="hidden 2xl:table-cell px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => handleSort('balance')}
                            >
                              <div className="flex items-center space-x-1">
                                <span>Saldo</span>
                                {getSortIcon('balance')}
                              </div>
                            </th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Ações
                            </th>
                         </tr>
                       </thead>
                       <tbody className="bg-card divide-y divide-border">
                         {paginatedClients.map((client) => (
                           <tr key={client.id} className="hover:bg-muted/30 transition-colors">
                             <td className="px-3 py-3">
                               <div className="flex items-center space-x-3">
                                 <div className={`w-2 h-2 rounded-full ${statusConfig[getClientVisualStatus(client)].dotColor}`}></div>
                                 <Avatar className="w-8 h-8 flex-shrink-0">
                                   <AvatarImage src={client.avatar} alt={client.name} />
                                   <AvatarFallback className="text-xs">{client.name.charAt(0)}</AvatarFallback>
                                 </Avatar>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium text-card-foreground truncate" title={client.name}>{client.name}</div>
                                  <div className="text-xs text-muted-foreground/80 truncate md:hidden">{client.company}</div>
                                  <div className="text-xs text-muted-foreground/80 truncate">{client.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              {isAccountRestricted(client) ? (
                                /* Se conta restrita, mostra apenas badge Restrita */
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge 
                                      variant="outline" 
                                      className="bg-zinc-900 text-white border-zinc-700 text-xs dark:bg-zinc-800 dark:border-zinc-600"
                                    >
                                      Restrita
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs bg-popover shadow-lg border border-border rounded-md p-3 text-sm z-50">
                                    <p>A conta de anúncios do Meta possui restrições ativas.</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                /* Se não restrita, mostra badge de status normal */
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge 
                                      variant="outline" 
                                      className={`${statusConfig[getClientVisualStatus(client)].color} text-xs cursor-help`}
                                    >
                                      {statusConfig[getClientVisualStatus(client)].label}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="whitespace-pre-line max-w-xs bg-popover shadow-lg border border-border rounded-md p-3 text-sm z-50">
                                    <p>{getStatusExplanation(client)}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-medium text-card-foreground">
                                      {client.consolidated_active_campaigns || client.active_campaigns || 0}
                                    </span>
                                    {(client.has_meta || client.has_google || client.instagram_account_id) && (
                                      <div className="flex gap-0.5 items-center">
                                        {client.has_meta && (
                                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                                            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill="#1877F2"/>
                                          </svg>
                                        )}
                                        {client.has_google && (
                                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                          </svg>
                                        )}
                                        {client.instagram_account_id && (
                                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                                            <defs>
                                              <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#FFDC80"/>
                                                <stop offset="25%" stopColor="#F77737"/>
                                                <stop offset="50%" stopColor="#E1306C"/>
                                                <stop offset="75%" stopColor="#C13584"/>
                                                <stop offset="100%" stopColor="#833AB4"/>
                                              </linearGradient>
                                            </defs>
                                            <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#instagram-gradient)"/>
                                            <circle cx="12" cy="12" r="4" fill="none" stroke="white" strokeWidth="1.5"/>
                                            <circle cx="17.5" cy="6.5" r="1.25" fill="white"/>
                                          </svg>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs space-y-1">
                                    <p className="font-medium">Campanhas Ativas</p>
                                    {client.has_meta && (
                                      <p className="flex items-center gap-1">
                                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
                                          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill="#1877F2"/>
                                        </svg>
                                        Meta: {client.meta_active_campaigns || 0}
                                      </p>
                                    )}
                                    {client.has_google && (
                                      <p className="flex items-center gap-1">
                                        <svg className="w-3 h-3" viewBox="0 0 24 24">
                                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                        </svg>
                                        Google: {client.google_active_campaigns || 0}
                                      </p>
                                    )}
                                    {!client.has_meta && !client.has_google && <p className="text-muted-foreground">Nenhuma plataforma configurada</p>}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </td>
                            <td className="hidden lg:table-cell px-3 py-3 whitespace-nowrap">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-sm text-card-foreground cursor-help">
                                    R$ {(client.consolidated_cpa || client.avg_cpl || 0).toFixed(2)}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs">
                                    <p className="font-medium">CPA Médio Consolidado</p>
                                    <p className="text-muted-foreground">Gasto Total / Conversões</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </td>
                             <td className="hidden xl:table-cell px-3 py-3 whitespace-nowrap">
                               <Tooltip>
                                 <TooltipTrigger asChild>
                                   <div className="text-sm text-card-foreground cursor-help">
                                     {client.consolidated_conversions || client.leads_generated || 0}
                                   </div>
                                 </TooltipTrigger>
                                 <TooltipContent>
                                   <div className="text-xs space-y-1">
                                     <p className="font-medium">Conversões</p>
                                     {client.has_meta && (
                                       <p className="flex items-center gap-1">
                                         <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
                                           <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill="#1877F2"/>
                                         </svg>
                                         Meta: {client.meta_conversions || 0}
                                       </p>
                                     )}
                                     {client.has_google && (
                                       <p className="flex items-center gap-1">
                                         <svg className="w-3 h-3" viewBox="0 0 24 24">
                                           <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                           <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                           <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                           <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                         </svg>
                                         Google: {client.google_conversions || 0}
                                       </p>
                                     )}
                                   </div>
                                 </TooltipContent>
                               </Tooltip>
                             </td>
                             <td className="hidden xl:table-cell px-3 py-3 whitespace-nowrap">
                               <Tooltip>
                                 <TooltipTrigger asChild>
                                   <div className="text-sm text-card-foreground cursor-help">
                                     R$ {(client.consolidated_budget || client.monthly_budget || 0).toLocaleString('pt-BR', { 
                                       minimumFractionDigits: 2, 
                                       maximumFractionDigits: 2 
                                     })}
                                   </div>
                                 </TooltipTrigger>
                                 <TooltipContent>
                                   <div className="text-xs space-y-1">
                                     <p className="font-medium">Orçamento Mensal</p>
                                     {client.meta_monthly_budget ? (
                                       <p className="flex items-center gap-1">
                                         <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
                                           <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill="#1877F2"/>
                                         </svg>
                                         Meta: R$ {client.meta_monthly_budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                       </p>
                                     ) : null}
                                     {client.google_monthly_budget ? (
                                       <p className="flex items-center gap-1">
                                         <svg className="w-3 h-3" viewBox="0 0 24 24">
                                           <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                           <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                           <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                           <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                         </svg>
                                         Google: R$ {client.google_monthly_budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                       </p>
                                     ) : null}
                                     {!client.meta_monthly_budget && !client.google_monthly_budget && client.monthly_budget ? (
                                       <p className="text-muted-foreground">Orçamento geral (não especificado por plataforma)</p>
                                     ) : null}
                                   </div>
                                 </TooltipContent>
                               </Tooltip>
                             </td>
                              <td className="hidden 2xl:table-cell px-3 py-3 whitespace-nowrap">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2 cursor-help">
                                      <div className="text-sm text-card-foreground">
                                        R$ {(client.consolidated_spend || client.spend || 0).toLocaleString('pt-BR', { 
                                          minimumFractionDigits: 2, 
                                          maximumFractionDigits: 2 
                                        })}
                                      </div>
                                      <BudgetStatusIcon client={client} />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs space-y-1">
                                      <p className="font-medium">Gasto Total</p>
                                      {client.has_meta && (
                                        <p className="flex items-center gap-1">
                                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
                                            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill="#1877F2"/>
                                          </svg>
                                          Meta: R$ {(client.meta_spend || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                      )}
                                      {client.has_google && (
                                        <p className="flex items-center gap-1">
                                          <svg className="w-3 h-3" viewBox="0 0 24 24">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                          </svg>
                                          Google: R$ {(client.google_spend || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </td>
                              <td className="hidden 2xl:table-cell px-3 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {client.payment_type === 'postpaid' ? (
                                    <div className="flex items-center gap-2">
                                      <div className="text-sm text-muted-foreground">💳 Pós-pago</div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="text-sm text-card-foreground">
                                        {client.facebook_ad_accounts?.balance !== undefined ? (
                                          <>
                                            R$ {client.facebook_ad_accounts.balance.toLocaleString('pt-BR', { 
                                              minimumFractionDigits: 2, 
                                              maximumFractionDigits: 2 
                                            })}
                                          </>
                                        ) : (
                                          <span className="text-muted-foreground">-</span>
                                        )}
                                      </div>
                                      <BalanceSufficiencyIcon client={client} />
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="w-7 h-7 p-0">
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                 <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link to={`/clientes/${client.id}`}>
                                      <Eye className="w-4 h-4 mr-2" />
                                      Ver detalhes
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      const dashboardUrl = `${window.location.origin}/dashboard-publico/${client.dashboard_token}`;
                                      window.open(dashboardUrl, '_blank');
                                    }}
                                  >
                                    <BarChart className="w-4 h-4 mr-2" />
                                    Dashboard
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedClient(client);
                                    setDialogMode('edit');
                                    setDialogOpen(true);
                                  }}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => {
                                      setSelectedClient(client);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Clients Cards - Mobile */}
            <div className="sm:hidden space-y-3">
              {paginatedClients.map((client) => (
                <Card key={client.id} className="p-3">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className={`w-3 h-3 rounded-full ${statusConfig[getClientVisualStatus(client)].dotColor} flex-shrink-0`}></div>
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarImage src={client.avatar} alt={client.name} />
                          <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-card-foreground truncate" title={client.name}>
                            {client.name}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {client.email}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-8 h-8 p-0 flex-shrink-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/clientes/${client.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver detalhes
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedClient(client);
                            setDialogMode('edit');
                            setDialogOpen(true);
                          }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => {
                              setSelectedClient(client);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Status and Company */}
                    <div className="flex items-center justify-between">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge 
                            variant="outline" 
                            className={`${statusConfig[getClientVisualStatus(client)].color} cursor-help`}
                          >
                            {statusConfig[getClientVisualStatus(client)].label}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="whitespace-pre-line max-w-xs bg-popover shadow-lg border border-border rounded-md p-3 text-sm z-50">
                          <p>{getStatusExplanation(client)}</p>
                        </TooltipContent>
                      </Tooltip>
                      <div className="text-sm text-muted-foreground truncate max-w-[150px]" title={client.company}>
                        {client.company}
                      </div>
                    </div>

                     {/* Platform Badges */}
                     {(client.has_meta || client.has_google || client.instagram_account_id) && (
                       <div className="flex items-center gap-2 text-xs">
                         <span className="text-muted-foreground">Plataformas:</span>
                         {client.has_meta && (
                           <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                             <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
                               <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill="#1877F2"/>
                             </svg>
                             Meta
                           </span>
                         )}
                         {client.has_google && (
                           <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                             <svg className="w-3 h-3" viewBox="0 0 24 24">
                               <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                               <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                               <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                               <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                             </svg>
                             Google
                           </span>
                         )}
                         {client.instagram_account_id && (
                           <span className="bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                             <svg className="w-3 h-3" viewBox="0 0 24 24">
                               <defs>
                                 <linearGradient id="instagram-gradient-mobile" x1="0%" y1="100%" x2="100%" y2="0%">
                                   <stop offset="0%" stopColor="#FFDC80"/>
                                   <stop offset="25%" stopColor="#F77737"/>
                                   <stop offset="50%" stopColor="#E1306C"/>
                                   <stop offset="75%" stopColor="#C13584"/>
                                   <stop offset="100%" stopColor="#833AB4"/>
                                 </linearGradient>
                               </defs>
                               <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#instagram-gradient-mobile)"/>
                               <circle cx="12" cy="12" r="4" fill="none" stroke="white" strokeWidth="1.5"/>
                               <circle cx="17.5" cy="6.5" r="1.25" fill="white"/>
                             </svg>
                             Instagram
                           </span>
                         )}
                       </div>
                     )}

                     {/* Metrics Grid */}
                     <div className="grid grid-cols-2 gap-3 text-sm">
                       <div>
                         <span className="text-muted-foreground">Campanhas:</span>
                         <span className="ml-1 font-medium">{client.consolidated_active_campaigns || client.active_campaigns || 0}</span>
                       </div>
                       <div>
                         <span className="text-muted-foreground">Conversões:</span>
                         <span className="ml-1 font-medium">{client.consolidated_conversions || client.leads_generated || 0}</span>
                       </div>
                       <div>
                         <span className="text-muted-foreground">CPA Médio:</span>
                         <span className="ml-1 font-medium">R$ {(client.consolidated_cpa || client.avg_cpl || 0).toFixed(2)}</span>
                       </div>
                       <div>
                         <span className="text-muted-foreground">Setor:</span>
                         <span className="ml-1 font-medium truncate" title={client.sector}>{client.sector}</span>
                       </div>
                       <div>
                         <span className="text-muted-foreground">Orçamento:</span>
                         <span className="ml-1 font-medium">R$ {(client.consolidated_budget || client.monthly_budget || 0).toLocaleString('pt-BR', { 
                           minimumFractionDigits: 0, 
                           maximumFractionDigits: 0 
                         })}</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <div>
                            <span className="text-muted-foreground">Gasto:</span>
                            <span className="ml-1 font-medium">R$ {(client.consolidated_spend || client.spend || 0).toLocaleString('pt-BR', { 
                              minimumFractionDigits: 0, 
                              maximumFractionDigits: 0 
                            })}</span>
                          </div>
                          <BudgetStatusIcon client={client} />
                        </div>
                      </div>

                     {/* Additional Info */}
                     {(client.consolidated_budget || client.monthly_budget || 0) > 0 && (
                       <div className="pt-2 border-t border-border">
                         <div className="text-sm text-muted-foreground">
                           <span className="font-medium">Orçamento Mensal:</span> R$ {(client.consolidated_budget || client.monthly_budget || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <Card className="mt-4">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <div className="text-sm text-gray-700 text-center sm:text-left">
                    Mostrando <span className="font-medium">{startIndex + 1}</span> a{" "}
                    <span className="font-medium">{Math.min(startIndex + itemsPerPage, totalClients)}</span> de{" "}
                    <span className="font-medium">{totalClients}</span> clientes
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="flex items-center space-x-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Anterior</span>
                    </Button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let page;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      );
                    })}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="flex items-center space-x-1"
                    >
                      <span className="hidden sm:inline">Próximo</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <ClientDialog
          key={selectedClient?.id ?? dialogMode}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          client={selectedClient ?? undefined}
          title={dialogMode === 'create' ? 'Adicionar Cliente' : 'Editar Cliente'}
          onSubmit={async (clientData) => {
            if (dialogMode === 'create') {
              await createClient(clientData);
            } else {
              await updateClient(selectedClient!.id, clientData);
              // Force refetch after update to ensure UI reflects changes
              await fetchClients();
            }
            // Close dialog after successful update
            setDialogOpen(false);
          }}
        />

        <DeleteClientDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          client={selectedClient}
          onConfirm={async () => {
            if (selectedClient) {
              await deleteClient(selectedClient.id);
              setDeleteDialogOpen(false);
            }
          }}
        />

        <UnifiedSyncDialog
          open={syncDialogOpen}
          onOpenChange={setSyncDialogOpen}
          companyId={activeCompany?.company_id || ''}
        />

        <SyncProgressModal
          open={syncing}
          progress={{
            current: progress.current,
            total: progress.total,
            clientName: progress.clientName || ''
          }}
        />

        <SyncProgressModal
          open={recalculating}
          progress={recalculatingProgress}
          title="Reaplicando status"
          description="Aguarde enquanto aplicamos os status das contas..."
          actionLabel="Aplicando status"
        />
      </div>
      </TooltipProvider>
    </DashboardLayout>
  );
};

export default Clientes;