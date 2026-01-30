import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  TrendingUp, 
  Settings, 
  Heart,
  DollarSign,
  Users,
  AlertTriangle,
  MoreVertical,
  MessageCircle,
  Phone,
  Eye,
  Star
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { HealthScore360Data } from '@/hooks/useCSHealthScore360';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { CSNewTouchpointModal } from './CSNewTouchpointModal';
import { CSNPSCollectModal } from './CSNPSCollectModal';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CSHealthScore360CardProps {
  data: HealthScore360Data;
  onViewClient?: (clientId: string, clientName: string) => void;
}

export function CSHealthScore360Card({ data, onViewClient }: CSHealthScore360CardProps) {
  const navigate = useNavigate();
  const [showTouchpoint, setShowTouchpoint] = useState(false);
  const [showNPS, setShowNPS] = useState(false);
  const [preselectedType, setPreselectedType] = useState<string>('call');

  // Fetch client phone
  const { data: phoneData } = useQuery({
    queryKey: ['client-phone', data.clientId],
    queryFn: async () => {
      const { data: contacts } = await supabase
        .from('whatsapp_client_contacts')
        .select('phone')
        .eq('client_id', data.clientId)
        .eq('is_active', true)
        .limit(1);
      
      return contacts?.[0]?.phone?.replace(/\D/g, '') || null;
    },
    enabled: !!data.clientId,
    staleTime: 1000 * 60 * 10, // 10 min
  });

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'critical': return 'Crítico';
      case 'high': return 'Alto';
      case 'medium': return 'Médio';
      case 'low': return 'Baixo';
      default: return level;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (phoneData) {
      window.open(`https://wa.me/${phoneData}`, '_blank');
      setTimeout(() => {
        setPreselectedType('whatsapp');
        setShowTouchpoint(true);
      }, 2000);
    } else {
      toast.error('Telefone não cadastrado');
    }
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (phoneData) {
      window.open(`tel:+${phoneData}`, '_blank');
      setTimeout(() => {
        setPreselectedType('call');
        setShowTouchpoint(true);
      }, 2000);
    } else {
      toast.error('Telefone não cadastrado');
    }
  };

  const handleTouchpoint = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTouchpoint(true);
  };

  const handleNPS = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowNPS(true);
  };

  const handleViewClient = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewClient) {
      onViewClient(data.clientId, data.clientName);
    } else {
      navigate(`/clientes/${data.clientId}/cs`);
    }
  };

  const handleCardClick = () => {
    if (onViewClient) {
      onViewClient(data.clientId, data.clientName);
    } else {
      navigate(`/clientes/${data.clientId}/cs`);
    }
  };

  return (
    <>
      <Card 
        className={cn(
          'cursor-pointer transition-all hover:shadow-lg relative group',
          data.churnRiskLevel === 'critical' && 'border-red-200',
          data.churnRiskLevel === 'high' && 'border-orange-200',
        )}
        onClick={handleCardClick}
      >
        {/* Quick Actions Dropdown */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleWhatsApp}>
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCall}>
                <Phone className="h-4 w-4 mr-2" />
                Ligar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleTouchpoint}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Registrar Touchpoint
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleNPS}>
                <Star className="h-4 w-4 mr-2" />
                Coletar NPS
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleViewClient}>
                <Eye className="h-4 w-4 mr-2" />
                Ver Cliente
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={data.clientAvatar || undefined} />
                <AvatarFallback>
                  {data.clientName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base">{data.clientName}</CardTitle>
                <Badge variant="outline" className={cn('text-xs', getRiskColor(data.churnRiskLevel))}>
                  Risco {getRiskLabel(data.churnRiskLevel)}
                </Badge>
              </div>
            </div>
            <div className={cn('text-3xl font-bold', getScoreColor(data.healthScoreTotal))}>
              {data.healthScoreTotal}%
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Score Total Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Saúde Geral</span>
              <span>{data.healthScoreTotal}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className={cn('h-full transition-all', getProgressColor(data.healthScoreTotal))}
                style={{ width: `${data.healthScoreTotal}%` }}
              />
            </div>
          </div>

          {/* 3 Pilares */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <DollarSign className="h-4 w-4 mx-auto text-green-600 mb-1" />
              <p className={cn('text-lg font-bold', getScoreColor(data.healthScoreFinancial))}>
                {data.healthScoreFinancial}
              </p>
              <p className="text-xs text-muted-foreground">Financeiro</p>
            </div>
            
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <Settings className="h-4 w-4 mx-auto text-blue-600 mb-1" />
              <p className={cn('text-lg font-bold', getScoreColor(data.healthScoreOperational))}>
                {data.healthScoreOperational}
              </p>
              <p className="text-xs text-muted-foreground">Operacional</p>
            </div>
            
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <Heart className="h-4 w-4 mx-auto text-red-500 mb-1" />
              <p className={cn('text-lg font-bold', getScoreColor(data.healthScoreRelational))}>
                {data.healthScoreRelational}
              </p>
              <p className="text-xs text-muted-foreground">Relacional</p>
            </div>
          </div>

          {/* Métricas Rápidas */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">ROAS:</span>
              <span className={cn('font-medium', data.currentRoas && data.currentRoas >= data.targetRoas ? 'text-green-600' : 'text-red-600')}>
                {data.currentRoas ? `${data.currentRoas.toFixed(1)}x` : '-'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">NPS:</span>
              <span className={cn('font-medium', 
                data.npsScore === null ? '' :
                data.npsScore >= 9 ? 'text-green-600' : 
                data.npsScore >= 7 ? 'text-yellow-600' : 'text-red-600'
              )}>
                {data.npsScore ?? '-'}
              </span>
            </div>
          </div>

          {/* Fatores de Risco */}
          {data.riskFactors.length > 0 && (
            <div className="pt-2 border-t">
              <div className="flex flex-wrap gap-1">
                {data.riskFactors.slice(0, 2).map((factor, i) => (
                  <Badge key={i} variant="outline" className="text-xs bg-red-50 border-red-200 text-red-700">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {factor}
                  </Badge>
                ))}
                {data.riskFactors.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{data.riskFactors.length - 2}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Touchpoint Modal */}
      <CSNewTouchpointModal
        open={showTouchpoint}
        onOpenChange={setShowTouchpoint}
        clientId={data.clientId}
        clientName={data.clientName}
        preselectedType={preselectedType}
      />

      {/* NPS Modal */}
      <CSNPSCollectModal
        open={showNPS}
        onOpenChange={setShowNPS}
        clientId={data.clientId}
        clientName={data.clientName}
      />
    </>
  );
}
