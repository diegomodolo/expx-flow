import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Eye, 
  Target, 
  ShoppingCart, 
  RotateCcw,
  Users,
  MousePointer,
  TrendingUp,
  DollarSign,
  BarChart3,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface Campaign {
  id: string;
  name: string;
  objective?: string;
  status: string;
  spend: number;
  cpa: number;
  ctr: number;
  conversions: number;
  reach?: number;
  impressions?: number;
  clicks?: number;
  frequency?: number;
}

interface FunnelAnalysisProps {
  campaigns: Campaign[];
}

interface FunnelLevel {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  campaigns: Campaign[];
  budgetPercentage: number;
  metrics: {
    primary: number;
    primaryLabel: string;
    secondary: number;
    secondaryLabel: string;
    tertiary: number;
    tertiaryLabel: string;
  };
}

export const FunnelAnalysis = ({ campaigns }: FunnelAnalysisProps) => {
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);

  // Função para classificar campanhas por nível do funil
  const classifyCampaignsByFunnel = useMemo(() => {
    const topo: Campaign[] = [];
    const meio: Campaign[] = [];
    const fundo: Campaign[] = [];
    const retencao: Campaign[] = [];

    campaigns.forEach(campaign => {
      const objective = campaign.objective?.toUpperCase() || '';
      
      // TOPO - Descoberta
      if (objective.includes('AWARENESS') || 
          objective.includes('REACH') || 
          objective.includes('BRAND') ||
          objective.includes('VIDEO_VIEWS')) {
        topo.push(campaign);
      }
      // MEIO - Consideração  
      else if (objective.includes('TRAFFIC') || 
               objective.includes('ENGAGEMENT') || 
               objective.includes('LEADS') ||
               objective.includes('OUTCOME_LEADS') ||
               objective.includes('MESSAGES') ||
               objective.includes('POST_ENGAGEMENT')) {
        meio.push(campaign);
      }
      // FUNDO - Conversão
      else if (objective.includes('CONVERSIONS') || 
               objective.includes('OFFSITE_CONVERSIONS') ||
               objective.includes('CATALOG_SALES') ||
               objective.includes('OUTCOME_SALES') ||
               objective.includes('APP_INSTALLS')) {
        fundo.push(campaign);
      }
      // RETENÇÃO - padrão para campanhas não classificadas ou remarketing
      else {
        retencao.push(campaign);
      }
    });

    return { topo, meio, fundo, retencao };
  }, [campaigns]);

  // Calcular métricas para cada nível
  const funnelLevels: FunnelLevel[] = useMemo(() => {
    const { topo, meio, fundo, retencao } = classifyCampaignsByFunnel;
    
    // Calculate total spend across all campaigns for percentage calculation
    const totalSpend = campaigns.reduce((sum, c) => sum + (c.spend || 0), 0);

    return [
      {
        id: 'topo',
        name: 'TOPO',
        description: 'Descoberta',
        icon: Eye,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 border-blue-200',
        campaigns: topo,
        budgetPercentage: totalSpend > 0 ? (topo.reduce((sum, c) => sum + (c.spend || 0), 0) / totalSpend) * 100 : 0,
        metrics: {
          primary: topo.reduce((sum, c) => sum + (c.reach || 0), 0),
          primaryLabel: 'Alcance Único',
          secondary: topo.reduce((sum, c) => sum + (c.impressions || 0), 0),
          secondaryLabel: 'Impressões',
          tertiary: topo.length > 0 ? topo.reduce((sum, c) => sum + c.ctr, 0) / topo.length : 0,
          tertiaryLabel: 'CTR Médio'
        }
      },
      {
        id: 'meio',
        name: 'MEIO', 
        description: 'Consideração',
        icon: Target,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50 border-yellow-200',
        campaigns: meio,
        budgetPercentage: totalSpend > 0 ? (meio.reduce((sum, c) => sum + (c.spend || 0), 0) / totalSpend) * 100 : 0,
        metrics: {
          primary: meio.reduce((sum, c) => sum + (c.clicks || 0), 0),
          primaryLabel: 'Cliques',
          secondary: meio.reduce((sum, c) => sum + c.conversions, 0),
          secondaryLabel: 'Leads Gerados',
          tertiary: meio.length > 0 ? meio.reduce((sum, c) => sum + c.cpa, 0) / meio.length : 0,
          tertiaryLabel: 'CPL Médio'
        }
      },
      {
        id: 'fundo',
        name: 'FUNDO',
        description: 'Conversão', 
        icon: ShoppingCart,
        color: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200',
        campaigns: fundo,
        budgetPercentage: totalSpend > 0 ? (fundo.reduce((sum, c) => sum + (c.spend || 0), 0) / totalSpend) * 100 : 0,
        metrics: {
          primary: fundo.reduce((sum, c) => sum + c.conversions, 0),
          primaryLabel: 'Conversões',
          secondary: fundo.length > 0 ? fundo.reduce((sum, c) => sum + c.cpa, 0) / fundo.length : 0,
          secondaryLabel: 'CPA Médio',
          tertiary: fundo.length > 0 && fundo.reduce((sum, c) => sum + (c.clicks || 0), 0) > 0 
            ? (fundo.reduce((sum, c) => sum + c.conversions, 0) / fundo.reduce((sum, c) => sum + (c.clicks || 0), 0)) * 100
            : 0,
          tertiaryLabel: 'Taxa de Conversão'
        }
      },
      {
        id: 'retencao',
        name: 'RETENÇÃO',
        description: 'Pós-venda',
        icon: RotateCcw,
        color: 'text-purple-600', 
        bgColor: 'bg-purple-50 border-purple-200',
        campaigns: retencao,
        budgetPercentage: totalSpend > 0 ? (retencao.reduce((sum, c) => sum + (c.spend || 0), 0) / totalSpend) * 100 : 0,
        metrics: {
          primary: retencao.reduce((sum, c) => sum + (c.reach || 0), 0),
          primaryLabel: 'Clientes Impactados',
          secondary: retencao.reduce((sum, c) => sum + c.conversions, 0),
          secondaryLabel: 'Conversões de Clientes',
          tertiary: retencao.length > 0 ? retencao.reduce((sum, c) => sum + (c.frequency || 1), 0) / retencao.length : 0,
          tertiaryLabel: 'Frequência Média'
        }
      }
    ];
  }, [classifyCampaignsByFunnel, campaigns]);

  // Dados para gráfico de distribuição de investimento
  const investmentData = useMemo(() => {
    return funnelLevels.map(level => ({
      name: level.name,
      value: level.campaigns.reduce((sum, c) => sum + c.spend, 0),
      color: level.color.replace('text-', '#').replace('-600', '')
    }));
  }, [funnelLevels]);

  // Dados para gráfico de CPA por nível
  const cpaData = useMemo(() => {
    return funnelLevels.map(level => ({
      name: level.name,
      cpa: level.campaigns.length > 0 
        ? level.campaigns.reduce((sum, c) => sum + c.cpa, 0) / level.campaigns.length
        : 0
    }));
  }, [funnelLevels]);

  const toggleLevel = (levelId: string) => {
    setExpandedLevel(expandedLevel === levelId ? null : levelId);
  };

  const COLORS = ['#2563eb', '#d97706', '#059669', '#7c3aed'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold">Funil de Conversão</h4>
          <p className="text-sm text-gray-600">Performance das campanhas por etapa do funil de marketing</p>
        </div>
      </div>

      {/* Funil Visual */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {funnelLevels.map((level, index) => (
          <Card key={level.id} className={`${level.bgColor} border-2 transition-all hover:shadow-md`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <level.icon className={`w-5 h-5 ${level.color}`} />
                  <div>
                    <CardTitle className="text-sm font-bold">{level.name}</CardTitle>
                     <p className="text-xs text-gray-600">{level.description}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {level.campaigns.length} campanhas
                </Badge>
              </div>
              {/* Texto explicativo dos tipos de campanha */}
              <div className="mt-2 px-2 py-1 bg-white/50 rounded-md border">
                <p className="text-xs text-gray-500">
                  {level.id === 'topo' && "Reconhecimento de marca • Alcance • Visualizações de vídeo"}
                  {level.id === 'meio' && "Tráfego • Engajamento • Geração de leads • Mensagens"}
                  {level.id === 'fundo' && "Conversões • Vendas do catálogo • Tráfego otimizado"}
                  {level.id === 'retencao' && "Remarketing • Públicos personalizados • Engajamento contínuo"}
                </p>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Principais métricas em linha */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Porcentagem do orçamento */}
                  <div className="text-center bg-white/70 rounded-lg py-2 px-2 border">
                    <p className="text-lg font-bold text-gray-900">
                      {level.budgetPercentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-600">do orçamento</p>
                    <p className="text-xs text-gray-500 mt-1">
                      R$ {level.campaigns.reduce((sum, c) => sum + (c.spend || 0), 0).toFixed(0)}
                    </p>
                  </div>

                  {/* Métrica principal da etapa */}
                  <div className="text-center bg-white/70 rounded-lg py-2 px-2 border">
                    <p className="text-lg font-bold text-gray-900">
                      {level.id === 'meio' && level.metrics.tertiary 
                        ? `R$ ${level.metrics.tertiary.toFixed(2)}`
                        : level.id === 'fundo' && level.metrics.tertiary
                        ? `${level.metrics.tertiary.toFixed(1)}%`
                        : level.id === 'retencao'
                        ? level.metrics.primary.toLocaleString()
                        : level.metrics.primary.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">
                      {level.id === 'meio' ? level.metrics.tertiaryLabel 
                       : level.id === 'fundo' ? level.metrics.tertiaryLabel
                       : level.id === 'retencao' ? level.metrics.primaryLabel
                       : level.metrics.primaryLabel}
                    </p>
                  </div>
                </div>

                {/* Métricas secundárias */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-white/50 rounded-md py-1 px-2">
                    <p className="text-sm font-semibold text-gray-800">
                      {level.id === 'meio' ? level.metrics.secondary.toLocaleString()
                       : level.id === 'fundo' ? `R$ ${level.metrics.secondary.toFixed(2)}`
                       : level.id === 'retencao' ? level.metrics.secondary.toLocaleString()
                       : level.metrics.secondary.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {level.id === 'meio' ? level.metrics.secondaryLabel
                       : level.id === 'fundo' ? level.metrics.secondaryLabel  
                       : level.id === 'retencao' ? level.metrics.secondaryLabel
                       : level.metrics.secondaryLabel}
                    </p>
                  </div>
                  <div className="bg-white/50 rounded-md py-1 px-2">
                    <p className="text-sm font-semibold text-gray-800">
                      {level.id === 'retencao' ? level.metrics.tertiary.toFixed(1)
                       : level.id === 'meio' ? level.metrics.primary.toLocaleString()
                       : level.id === 'fundo' ? level.metrics.primary.toLocaleString()
                       : `${level.metrics.tertiary.toFixed(1)}%`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {level.id === 'retencao' ? level.metrics.tertiaryLabel
                       : level.id === 'meio' ? level.metrics.primaryLabel
                       : level.id === 'fundo' ? level.metrics.primaryLabel
                       : level.metrics.tertiaryLabel}
                    </p>
                  </div>
                </div>
                </div>

                {/* Botão para expandir campanhas */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleLevel(level.id)}
                  className="w-full mt-3"
                >
                  {expandedLevel === level.id ? (
                    <>Ver menos <ChevronUp className="w-3 h-3 ml-1" /></>
                  ) : (
                    <>Ver campanhas <ChevronDown className="w-3 h-3 ml-1" /></>
                  )}
                </Button>

                {/* Lista de campanhas expandida */}
                {expandedLevel === level.id && (
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                    {level.campaigns.length > 0 ? (
                      level.campaigns.map(campaign => (
                        <div key={campaign.id} className="p-2 bg-white rounded border text-xs">
                          <div className="flex justify-between items-start">
                            <p className="font-medium text-gray-900 truncate flex-1 mr-2">
                              {campaign.name}
                            </p>
                            <Badge 
                              variant={campaign.status === 'active' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {campaign.status === 'active' ? 'Ativo' : 'Pausado'}
                            </Badge>
                          </div>
                          <div className="mt-1 flex justify-between text-gray-600">
                            <span>R$ {campaign.spend.toFixed(0)}</span>
                            <span>{campaign.conversions} conv.</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500 text-center py-4">
                        Nenhuma campanha neste nível
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
        ))}
      </div>

      {/* Gráficos Complementares */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Distribuição de Investimento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span>Distribuição do Investimento</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={investmentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {investmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Investimento']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de CPA por Nível */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <span>CPA por Nível do Funil</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cpaData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'CPA Médio']} />
                <Bar dataKey="cpa" fill="#8884d8">
                  {cpaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Resumo Geral */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span>Resumo do Funil</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <p className="font-medium text-gray-700">Total de Campanhas</p>
              <p className="text-xl font-bold text-blue-600">{campaigns.length}</p>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-700">Investimento Total</p>
              <p className="text-xl font-bold text-green-600">
                R$ {campaigns.reduce((sum, c) => sum + c.spend, 0).toFixed(0)}
              </p>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-700">Conversões Totais</p>
              <p className="text-xl font-bold text-purple-600">
                {campaigns.reduce((sum, c) => sum + c.conversions, 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-700">CPA Geral</p>
              <p className="text-xl font-bold text-orange-600">
                R$ {campaigns.length > 0 
                  ? (campaigns.reduce((sum, c) => sum + c.cpa, 0) / campaigns.length).toFixed(2)
                  : '0.00'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};