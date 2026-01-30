import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Briefcase, AlertTriangle, AlertCircle, AlertOctagon, CheckCircle2, Activity, Star, Users,
  LayoutGrid, List, MoreHorizontal, MessageCircle, Phone, ClipboardList, ThumbsUp, ExternalLink
} from 'lucide-react';
import { useCSHealthScore360 } from '@/hooks/useCSHealthScore360';
import { CSHealthScore360Card } from '@/components/cs/CSHealthScore360Card';
import { useCSSquadFilter } from '@/contexts/CSSquadFilterContext';
import { CSSquadFilter } from '@/components/cs/CSSquadFilter';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { CSClientDetailModal } from '@/components/cs/CSClientDetailModal';

type RiskFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';
type ViewMode = 'table' | 'cards';

const VIEW_MODE_STORAGE_KEY = 'cs-portfolio-view-mode';

const riskTabs: { value: RiskFilter; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'all', label: 'Todos', icon: Briefcase, color: '' },
  { value: 'critical', label: 'Críticos', icon: AlertOctagon, color: 'text-red-600' },
  { value: 'high', label: 'Alto', icon: AlertTriangle, color: 'text-orange-600' },
  { value: 'medium', label: 'Médio', icon: AlertCircle, color: 'text-yellow-600' },
  { value: 'low', label: 'Baixo', icon: CheckCircle2, color: 'text-green-600' },
];

const getRiskBadgeStyle = (risk: string) => {
  switch (risk) {
    case 'critical':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    case 'high':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    case 'low':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getRiskLabel = (risk: string) => {
  switch (risk) {
    case 'critical': return 'Crítico';
    case 'high': return 'Alto';
    case 'medium': return 'Médio';
    case 'low': return 'Baixo';
    default: return '-';
  }
};

export default function CSPortfolioPage() {
  const { healthData, stats, isLoading } = useCSHealthScore360();
  const { selectedSquadId, squads } = useCSSquadFilter();
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  
  // Modal state for client details
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(null);
  
  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      return (stored === 'cards' || stored === 'table') ? stored : 'table';
    }
    return 'table';
  });

  // Persist view mode
  useEffect(() => {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  // Filtrar por squad se selecionado
  const squadFilteredData = useMemo(() => {
    if (!selectedSquadId) return healthData;
    return healthData.filter(c => c.squadId === selectedSquadId);
  }, [healthData, selectedSquadId]);

  // Filtrar por risco
  const filteredData = useMemo(() => {
    if (riskFilter === 'all') return squadFilteredData;
    return squadFilteredData.filter(c => c.churnRiskLevel === riskFilter);
  }, [squadFilteredData, riskFilter]);

  // Calcular contagens por risco
  const riskCounts = useMemo(() => ({
    all: squadFilteredData.length,
    critical: squadFilteredData.filter(c => c.churnRiskLevel === 'critical').length,
    high: squadFilteredData.filter(c => c.churnRiskLevel === 'high').length,
    medium: squadFilteredData.filter(c => c.churnRiskLevel === 'medium').length,
    low: squadFilteredData.filter(c => c.churnRiskLevel === 'low').length,
  }), [squadFilteredData]);

  // Recalcular stats filtradas
  const filteredStats = useMemo(() => {
    const data = squadFilteredData;
    const averageScore = data.length > 0
      ? Math.round(data.reduce((sum, c) => sum + c.healthScoreTotal, 0) / data.length)
      : 0;
    const npsClients = data.filter(c => c.npsScore !== null);
    const averageNps = npsClients.length > 0
      ? Math.round(npsClients.reduce((sum, c) => sum + (c.npsScore || 0), 0) / npsClients.length * 10) / 10
      : 0;
    return { averageScore, averageNps, total: data.length };
  }, [squadFilteredData]);

  // Get squad info for a client
  const getSquadInfo = (squadId: string | null) => {
    if (!squadId) return null;
    return squads.find(s => s.id === squadId);
  };

  // Handle actions
  const handleWhatsApp = (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement WhatsApp action
    console.log('WhatsApp action for client:', clientId);
  };

  const handleCall = (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement Call action
    console.log('Call action for client:', clientId);
  };

  const handleTouchpoint = (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement Touchpoint action
    console.log('Touchpoint action for client:', clientId);
  };

  const handleNPS = (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement NPS action
    console.log('NPS action for client:', clientId);
  };

  const handleViewClient = (clientId: string, clientName: string) => {
    setSelectedClient({ id: clientId, name: clientName });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            Saúde da Carteira
          </h1>
          <p className="text-muted-foreground">
            Visão consolidada da saúde de todos os clientes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(v) => v && setViewMode(v as ViewMode)}
            className="bg-muted rounded-lg p-1"
          >
            <ToggleGroupItem value="table" aria-label="Visualização em tabela" className="px-3">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="cards" aria-label="Visualização em cards" className="px-3">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <CSSquadFilter />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Saúde Média</p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">{filteredStats.averageScore}%</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Risco Crítico</p>
                <p className="text-3xl font-bold text-red-700 dark:text-red-300">{riskCounts.critical}</p>
              </div>
              <AlertOctagon className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">NPS Médio</p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{filteredStats.averageNps || '-'}</p>
              </div>
              <Star className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Clientes</p>
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{filteredStats.total}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Filter Tabs */}
      <Tabs value={riskFilter} onValueChange={(v) => setRiskFilter(v as RiskFilter)}>
        <TabsList className="w-full justify-start bg-muted/50 p-1">
          {riskTabs.map((tab) => {
            const Icon = tab.icon;
            const count = riskCounts[tab.value];
            
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "flex items-center gap-2 data-[state=active]:shadow-sm",
                  tab.value !== 'all' && "data-[state=active]:bg-card"
                )}
              >
                <Icon className={cn("h-4 w-4", tab.color)} />
                <span>{tab.label}</span>
                <Badge 
                  variant={riskFilter === tab.value ? "default" : "outline"} 
                  className={cn(
                    "ml-1 rounded-full h-5 min-w-5 text-xs",
                    tab.value === 'critical' && count > 0 && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
                    tab.value === 'high' && count > 0 && "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
                  )}
                >
                  {count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6 h-48 bg-muted/50" />
            </Card>
          ))}
        </div>
      ) : filteredData.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {riskFilter === 'all' ? 'Nenhum cliente configurado' : `Nenhum cliente com risco ${riskTabs.find(t => t.value === riskFilter)?.label}`}
            </h3>
            <p className="text-muted-foreground mb-4">
              {riskFilter === 'all' 
                ? 'Configure o Health Score 360 para seus clientes' 
                : 'Altere o filtro para ver outros clientes'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        /* Table View */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Cliente</TableHead>
                <TableHead>Squad</TableHead>
                <TableHead className="w-[150px]">Saúde</TableHead>
                <TableHead className="text-center">Financeiro</TableHead>
                <TableHead className="text-center">Operacional</TableHead>
                <TableHead className="text-center">Relacional</TableHead>
                <TableHead className="text-center">ROAS</TableHead>
                <TableHead className="text-center">NPS</TableHead>
                <TableHead>Risco</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((client) => {
                const squad = getSquadInfo(client.squadId);
                return (
                  <TableRow 
                    key={client.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewClient(client.clientId, client.clientName)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {client.clientName?.substring(0, 2).toUpperCase() || 'CL'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium truncate max-w-[180px]">{client.clientName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {squad ? (
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{ 
                            borderColor: squad.color || undefined,
                            color: squad.color || undefined 
                          }}
                        >
                          {squad.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={client.healthScoreTotal} 
                          className="h-2 flex-1" 
                        />
                        <span className="text-sm font-medium w-10 text-right">{client.healthScoreTotal}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "text-sm font-medium",
                        client.healthScoreFinancial >= 70 ? "text-green-600" : 
                        client.healthScoreFinancial >= 40 ? "text-yellow-600" : "text-red-600"
                      )}>
                        {client.healthScoreFinancial}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "text-sm font-medium",
                        client.healthScoreOperational >= 70 ? "text-green-600" : 
                        client.healthScoreOperational >= 40 ? "text-yellow-600" : "text-red-600"
                      )}>
                        {client.healthScoreOperational}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "text-sm font-medium",
                        client.healthScoreRelational >= 70 ? "text-green-600" : 
                        client.healthScoreRelational >= 40 ? "text-yellow-600" : "text-red-600"
                      )}>
                        {client.healthScoreRelational}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm">
                        {client.currentRoas ? `${client.currentRoas.toFixed(1)}x` : '-'}
                        {client.targetRoas && (
                          <span className="text-muted-foreground text-xs ml-1">
                            /{client.targetRoas}x
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "text-sm font-medium",
                        client.npsScore !== null && client.npsScore >= 9 ? "text-green-600" :
                        client.npsScore !== null && client.npsScore >= 7 ? "text-yellow-600" :
                        client.npsScore !== null ? "text-red-600" : "text-muted-foreground"
                      )}>
                        {client.npsScore !== null ? client.npsScore : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs", getRiskBadgeStyle(client.churnRiskLevel || ''))}>
                        {getRiskLabel(client.churnRiskLevel || '')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => handleWhatsApp(client.clientId, e)}>
                            <MessageCircle className="h-4 w-4 mr-2" />
                            WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleCall(client.clientId, e)}>
                            <Phone className="h-4 w-4 mr-2" />
                            Ligar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleTouchpoint(client.clientId, e)}>
                            <ClipboardList className="h-4 w-4 mr-2" />
                            Registrar Touchpoint
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleNPS(client.clientId, e)}>
                            <ThumbsUp className="h-4 w-4 mr-2" />
                            Coletar NPS
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewClient(client.clientId, client.clientName)}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Ver Cliente
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredData.map((client) => (
            <CSHealthScore360Card 
              key={client.id} 
              data={client} 
              onViewClient={handleViewClient}
            />
          ))}
        </div>
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
        <CSClientDetailModal
          open={!!selectedClient}
          onOpenChange={(open) => !open && setSelectedClient(null)}
          clientId={selectedClient.id}
          clientName={selectedClient.name}
        />
      )}
    </div>
  );
}
