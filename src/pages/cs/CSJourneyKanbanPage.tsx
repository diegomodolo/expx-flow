import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  Rocket, 
  Settings, 
  Target, 
  TrendingUp, 
  Crown,
  AlertTriangle,
  Eye,
  Lightbulb
} from 'lucide-react';
import { useCSHealthScore360, HealthScore360Data } from '@/hooks/useCSHealthScore360';
import { useCSSquadFilter } from '@/contexts/CSSquadFilterContext';
import { CSSquadFilter } from '@/components/cs/CSSquadFilter';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PipelineStage {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const pipelineStages: PipelineStage[] = [
  {
    id: 'onboarding',
    title: 'Onboarding',
    description: 'Fase inicial',
    icon: Rocket,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800',
  },
  {
    id: 'setup',
    title: 'Setup Campanha',
    description: 'Configurando',
    icon: Settings,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',
  },
  {
    id: 'first_leads',
    title: 'Primeiros Leads',
    description: 'Aguardando resultados',
    icon: Target,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/50 border-cyan-200 dark:border-cyan-800',
  },
  {
    id: 'optimization',
    title: 'Otimização',
    description: 'Ajustando performance',
    icon: TrendingUp,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800',
  },
  {
    id: 'scale',
    title: 'Escala',
    description: 'Expandindo resultados',
    icon: Crown,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
  },
];

function getClientStage(client: HealthScore360Data): string {
  // Logic to determine stage based on client data
  if (client.onboardingStatus === 'pending' || client.onboardingStatus === 'in_progress') {
    return 'onboarding';
  }
  
  if (client.activeCampaigns === 0) {
    return 'setup';
  }
  
  if (client.totalConversions < 10) {
    return 'first_leads';
  }
  
  if (client.healthScoreTotal < 70) {
    return 'optimization';
  }
  
  return 'scale';
}

function getHealthBadgeColor(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
  if (score >= 60) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
  if (score >= 40) return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
  return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
}

interface ClientCardProps {
  client: HealthScore360Data;
}

function ClientCard({ client }: ClientCardProps) {
  const navigate = useNavigate();
  
  return (
    <div 
      className="p-3 bg-card border rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer group"
      onClick={() => navigate(`/clientes/${client.clientId}/cs`)}
    >
      <div className="flex items-start gap-2">
        <Avatar className="h-8 w-8 border">
          <AvatarImage src={client.clientAvatar || undefined} />
          <AvatarFallback className="text-xs">
            {client.clientName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
            {client.clientName}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <Badge variant="outline" className={cn("text-xs", getHealthBadgeColor(client.healthScoreTotal))}>
              {client.healthScoreTotal}%
            </Badge>
            {client.churnRiskLevel === 'critical' && (
              <AlertTriangle className="h-3 w-3 text-red-500" />
            )}
          </div>
        </div>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        className="w-full mt-2 h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/clientes/${client.clientId}/cs`);
        }}
      >
        <Eye className="h-3 w-3 mr-1" />
        Ver detalhes
      </Button>
    </div>
  );
}

export default function CSJourneyKanbanPage() {
  const navigate = useNavigate();
  const { healthData, isLoading } = useCSHealthScore360();
  const { selectedSquadId } = useCSSquadFilter();

  // Filtrar por squad se selecionado
  const filteredData = useMemo(() => {
    if (!selectedSquadId) return healthData;
    return healthData.filter(c => c.squadId === selectedSquadId);
  }, [healthData, selectedSquadId]);

  // Agrupar clientes por stage
  const clientsByStage = useMemo(() => {
    const grouped: Record<string, HealthScore360Data[]> = {
      onboarding: [],
      setup: [],
      first_leads: [],
      optimization: [],
      scale: [],
    };

    filteredData.forEach(client => {
      const stage = getClientStage(client);
      grouped[stage].push(client);
    });

    // Ordenar cada grupo por health score (menor primeiro = mais atenção)
    Object.keys(grouped).forEach(stage => {
      grouped[stage].sort((a, b) => a.healthScoreTotal - b.healthScoreTotal);
    });

    return grouped;
  }, [filteredData]);

  // Detectar gargalos
  const bottleneck = useMemo(() => {
    let maxStage = '';
    let maxCount = 0;
    
    Object.entries(clientsByStage).forEach(([stage, clients]) => {
      if (stage !== 'scale' && clients.length > maxCount) {
        maxCount = clients.length;
        maxStage = stage;
      }
    });

    if (maxCount >= 5) {
      const stageName = pipelineStages.find(s => s.id === maxStage)?.title || maxStage;
      return `${maxCount} clientes travados no "${stageName}". Verificar gargalos.`;
    }
    return null;
  }, [clientsByStage]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            Pipeline de Sucesso
          </h1>
          <p className="text-muted-foreground">
            Visualize a jornada dos clientes em direção ao sucesso
          </p>
        </div>
        <CSSquadFilter />
      </div>

      {/* Insight de gargalo */}
      {bottleneck && (
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                💡 Insight: {bottleneck}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kanban Board */}
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
          {pipelineStages.map((stage) => {
            const clients = clientsByStage[stage.id] || [];
            const Icon = stage.icon;
            
            return (
              <div
                key={stage.id}
                className={cn(
                  "flex-shrink-0 w-64 rounded-lg border-2",
                  stage.bgColor
                )}
              >
                {/* Stage Header */}
                <div className="p-3 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-5 w-5", stage.color)} />
                      <span className="font-semibold text-sm">{stage.title}</span>
                    </div>
                    <Badge variant="secondary" className="rounded-full">
                      {clients.length}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stage.description}</p>
                </div>
                
                {/* Stage Content */}
                <ScrollArea className="h-[500px]">
                  <div className="p-2 space-y-2">
                    {isLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="animate-pulse h-20 bg-muted/50 rounded-lg" />
                      ))
                    ) : clients.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Icon className={cn("h-8 w-8 mx-auto mb-2 opacity-30", stage.color)} />
                        <p className="text-xs">Nenhum cliente</p>
                      </div>
                    ) : (
                      clients.map(client => (
                        <ClientCard key={client.id} client={client} />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
