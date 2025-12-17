import React, { useState } from 'react';
import { useClientHealthScore, ClientHealthData } from '@/hooks/useClientHealthScore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  ChevronRight,
  DollarSign,
  RefreshCw,
  TrendingDown,
  Wallet,
  Zap,
  Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AccountHealthRadarProps {
  maxItems?: number;
  showStats?: boolean;
  compact?: boolean;
}

const getRiskIcon = (riskLevel: string) => {
  switch (riskLevel) {
    case 'critical':
      return <AlertTriangle className="w-4 h-4 text-google-red-500" />;
    case 'attention':
      return <Activity className="w-4 h-4 text-google-yellow-500" />;
    default:
      return <CheckCircle className="w-4 h-4 text-google-green-500" />;
  }
};

const getRiskBadge = (riskLevel: string) => {
  switch (riskLevel) {
    case 'critical':
      return (
        <Badge className="bg-google-red-50 text-google-red-600 border-0 text-xs font-medium">
          🔴 Crítico
        </Badge>
      );
    case 'attention':
      return (
        <Badge className="bg-google-yellow-50 text-google-yellow-600 border-0 text-xs font-medium">
          🟡 Atenção
        </Badge>
      );
    default:
      return (
        <Badge className="bg-google-green-50 text-google-green-600 border-0 text-xs font-medium">
          🟢 Estável
        </Badge>
      );
  }
};

const getScoreColor = (score: number) => {
  if (score < 40) return 'text-google-red-600';
  if (score < 70) return 'text-google-yellow-600';
  return 'text-google-green-600';
};

const getProgressColor = (score: number) => {
  if (score < 40) return 'bg-google-red-500';
  if (score < 70) return 'bg-google-yellow-500';
  return 'bg-google-green-500';
};

function ClientHealthCard({ client, compact }: { client: ClientHealthData; compact?: boolean }) {
  const navigate = useNavigate();

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (compact) {
    return (
      <div 
        className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors group"
        onClick={() => navigate(`/clientes/${client.id}`)}
      >
        <div className="relative">
          <Avatar className="h-9 w-9">
            <AvatarImage src={client.avatar || undefined} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {getInitials(client.name)}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1">
            {getRiskIcon(client.riskLevel)}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {client.name}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs font-semibold ${getScoreColor(client.healthScore)}`}>
              {client.healthScore}/100
            </span>
            {client.riskFactors.length > 0 && (
              <span className="text-xs text-muted-foreground truncate">
                • {client.riskFactors[0]}
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  return (
    <div 
      className="p-4 rounded-xl border border-border bg-card hover:shadow-google-md transition-all cursor-pointer group"
      onClick={() => navigate(`/clientes/${client.id}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={client.avatar || undefined} />
              <AvatarFallback className="text-sm bg-primary/10 text-primary">
                {getInitials(client.name)}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h4 className="text-sm font-medium text-foreground">{client.name}</h4>
            <p className="text-xs text-muted-foreground">{client.sector}</p>
          </div>
        </div>
        {getRiskBadge(client.riskLevel)}
      </div>

      {/* Health Score Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Score de Saúde</span>
          <span className={`text-sm font-semibold ${getScoreColor(client.healthScore)}`}>
            {client.healthScore}/100
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${getProgressColor(client.healthScore)}`}
            style={{ width: `${client.healthScore}%` }}
          />
        </div>
      </div>

      {/* Key Indicators */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-xs">
                <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                <span className={client.balance !== null && client.balance <= 0 ? 'text-google-red-600 font-medium' : 'text-muted-foreground'}>
                  {client.isPrePaid ? formatCurrency(client.balance) : '💳 Pós-pago'}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Saldo disponível na conta de anúncios</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-xs">
                <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                <span className={client.activeCampaigns === 0 ? 'text-google-red-600 font-medium' : 'text-muted-foreground'}>
                  {client.activeCampaigns} campanha{client.activeCampaigns !== 1 ? 's' : ''} ativa{client.activeCampaigns !== 1 ? 's' : ''}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Número de campanhas ativas</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Risk Factors */}
      {client.riskFactors.length > 0 && (
        <div className="pt-2 border-t border-border">
          <div className="flex flex-wrap gap-1">
            {client.riskFactors.slice(0, 2).map((factor, idx) => (
              <span 
                key={idx} 
                className="text-xs px-2 py-0.5 rounded-full bg-google-red-50 text-google-red-600"
              >
                {factor}
              </span>
            ))}
            {client.riskFactors.length > 2 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                +{client.riskFactors.length - 2} mais
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AccountHealthRadar({ maxItems = 10, showStats = true, compact = false }: AccountHealthRadarProps) {
  const { clientsHealth, isLoading, error, refetch, stats } = useClientHealthScore();
  const [viewMode, setViewMode] = useState<'priority' | 'all'>('priority');
  const navigate = useNavigate();

  const displayedClients = viewMode === 'priority' 
    ? clientsHealth.filter(c => c.riskLevel !== 'stable').slice(0, maxItems)
    : clientsHealth.slice(0, maxItems);

  if (isLoading) {
    return (
      <Card className="bg-card rounded-xl shadow-google-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-48" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-card rounded-xl shadow-google-sm">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            Erro ao carregar dados de saúde das contas
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card rounded-xl shadow-google-sm hover:shadow-google-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <CardTitle className="text-title-lg text-foreground">
              Radar de Saúde das Contas
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => refetch()}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setViewMode(viewMode === 'priority' ? 'all' : 'priority')}
            >
              {viewMode === 'priority' ? 'Ver Todos' : 'Prioridade'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Stats Summary */}
        {showStats && (
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="text-center p-3 rounded-lg bg-google-red-50 dark:bg-google-red-900/20">
              <div className="text-2xl font-bold text-google-red-600">{stats.critical}</div>
              <div className="text-xs text-muted-foreground">Críticos</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-google-yellow-50 dark:bg-google-yellow-900/20">
              <div className="text-2xl font-bold text-google-yellow-600">{stats.attention}</div>
              <div className="text-xs text-muted-foreground">Atenção</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-google-green-50 dark:bg-google-green-900/20">
              <div className="text-2xl font-bold text-google-green-600">{stats.stable}</div>
              <div className="text-xs text-muted-foreground">Estáveis</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary">
              <div className={`text-2xl font-bold ${getScoreColor(stats.averageScore)}`}>
                {stats.averageScore}
              </div>
              <div className="text-xs text-muted-foreground">Score Médio</div>
            </div>
          </div>
        )}

        {/* Client List */}
        {displayedClients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {viewMode === 'priority' ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle className="w-12 h-12 text-google-green-500" />
                <p>Todas as contas estão saudáveis!</p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setViewMode('all')}
                >
                  Ver todas as contas
                </Button>
              </div>
            ) : (
              <p>Nenhum cliente encontrado</p>
            )}
          </div>
        ) : (
          <ScrollArea className={compact ? "h-[300px]" : "h-[400px]"}>
            <div className={compact ? "space-y-1" : "space-y-3 pr-2"}>
              {displayedClients.map(client => (
                <ClientHealthCard 
                  key={client.id} 
                  client={client} 
                  compact={compact}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        {/* View All Link */}
        {clientsHealth.length > maxItems && (
          <div className="mt-4 pt-3 border-t border-border">
            <Button
              variant="ghost"
              className="w-full text-sm text-primary hover:text-primary"
              onClick={() => navigate('/clientes')}
            >
              <Eye className="w-4 h-4 mr-2" />
              Ver todos os {clientsHealth.length} clientes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
