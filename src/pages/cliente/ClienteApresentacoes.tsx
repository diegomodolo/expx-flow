import { useState } from 'react';
import { useClientContext } from './ClienteContext';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, ExternalLink, Trash2, Eye, Copy, Sparkles, TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CampaignPresentation {
  id: string;
  name: string;
  period_start: string;
  period_end: string;
  status: string;
  public_token: string | null;
  view_count: number;
  created_at: string;
  executive_summary: string | null;
  action_plan: string | null;
}

export function ClienteApresentacoes() {
  const { client } = useClientContext();
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('last_30d');
  const [presentationName, setPresentationName] = useState('');

  // Fetch presentations
  const { data: presentations = [], isLoading } = useQuery({
    queryKey: ['campaign-presentations', client.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_presentations')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CampaignPresentation[];
    },
    enabled: !!client.id,
  });

  // Calculate date range from period
  const getDateRange = (period: string) => {
    const end = new Date();
    let start = new Date();

    switch (period) {
      case 'last_7d':
        start.setDate(end.getDate() - 7);
        break;
      case 'last_14d':
        start.setDate(end.getDate() - 14);
        break;
      case 'last_30d':
        start.setDate(end.getDate() - 30);
        break;
      case 'last_60d':
        start.setDate(end.getDate() - 60);
        break;
      case 'last_90d':
        start.setDate(end.getDate() - 90);
        break;
      default:
        start.setDate(end.getDate() - 30);
    }

    return { start, end };
  };

  // Create presentation mutation
  const createPresentationMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !activeCompany?.id || !client.id) {
        throw new Error('Missing required data');
      }

      const { start, end } = getDateRange(selectedPeriod);
      const token = crypto.randomUUID().replace(/-/g, '').substring(0, 16);

      // Create presentation
      const { data: presentation, error: createError } = await supabase
        .from('campaign_presentations')
        .insert({
          client_id: client.id,
          company_id: activeCompany.id,
          user_id: user.id,
          name: presentationName || `Relatório ${format(start, 'dd/MM')} - ${format(end, 'dd/MM/yyyy')}`,
          period_start: format(start, 'yyyy-MM-dd'),
          period_end: format(end, 'yyyy-MM-dd'),
          status: 'draft',
          public_token: token,
        })
        .select()
        .single();

      if (createError) throw createError;

      return presentation;
    },
    onSuccess: (presentation) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-presentations', client.id] });
      setIsCreateDialogOpen(false);
      setPresentationName('');
      toast.success('Apresentação criada com sucesso!');
      
      // Trigger AI analysis generation
      generateAIAnalysis(presentation.id);
    },
    onError: (error) => {
      console.error('Error creating presentation:', error);
      toast.error('Erro ao criar apresentação');
    },
  });

  // Generate AI analysis
  const generateAIAnalysis = async (presentationId: string) => {
    setIsGenerating(true);
    try {
      const { error } = await supabase.functions.invoke('generate-campaign-presentation-analysis', {
        body: {
          presentationId,
          clientId: client.id,
          companyId: activeCompany?.id,
        },
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['campaign-presentations', client.id] });
      toast.success('Análise por IA gerada com sucesso!');
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      toast.error('Erro ao gerar análise por IA');
    } finally {
      setIsGenerating(false);
    }
  };

  // Publish presentation mutation
  const publishMutation = useMutation({
    mutationFn: async (presentationId: string) => {
      const { error } = await supabase
        .from('campaign_presentations')
        .update({ status: 'published' })
        .eq('id', presentationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-presentations', client.id] });
      toast.success('Apresentação publicada!');
    },
  });

  // Delete presentation mutation
  const deleteMutation = useMutation({
    mutationFn: async (presentationId: string) => {
      const { error } = await supabase
        .from('campaign_presentations')
        .delete()
        .eq('id', presentationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-presentations', client.id] });
      toast.success('Apresentação excluída!');
    },
  });

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/resultados/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado para a área de transferência!');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Rascunho</Badge>;
      case 'ready':
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Pronta</Badge>;
      case 'published':
        return <Badge className="bg-green-500 hover:bg-green-600">Publicada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Apresentações de Resultados</h1>
          <p className="text-muted-foreground">
            Crie apresentações de performance para compartilhar com seu cliente
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Apresentação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Apresentação</DialogTitle>
              <DialogDescription>
                Gere uma apresentação de resultados para seu cliente com análise por IA
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Apresentação (opcional)</Label>
                <Input
                  id="name"
                  placeholder="Ex: Relatório Mensal - Dezembro 2024"
                  value={presentationName}
                  onChange={(e) => setPresentationName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_7d">Últimos 7 dias</SelectItem>
                    <SelectItem value="last_14d">Últimos 14 dias</SelectItem>
                    <SelectItem value="last_30d">Últimos 30 dias</SelectItem>
                    <SelectItem value="last_60d">Últimos 60 dias</SelectItem>
                    <SelectItem value="last_90d">Últimos 90 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="w-4 h-4 text-primary" />
                  A apresentação incluirá:
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Métricas de performance (investimento, leads, CTR, etc.)</li>
                  <li>• Análise de campanhas ativas com destaque positivo</li>
                  <li>• Preview dos melhores criativos no formato do feed</li>
                  <li>• Resumo executivo gerado por IA</li>
                  <li>• Plano de ação para o próximo período</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => createPresentationMutation.mutate()}
                disabled={createPresentationMutation.isPending}
              >
                {createPresentationMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Criar e Gerar IA
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isGenerating && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <div>
              <p className="font-medium">Gerando análise por IA...</p>
              <p className="text-sm text-muted-foreground">
                Analisando campanhas e criativos para criar insights positivos
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : presentations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhuma apresentação criada</h3>
            <p className="text-muted-foreground text-sm max-w-md mt-2">
              Crie uma apresentação de resultados para compartilhar com seu cliente as métricas de performance das campanhas
            </p>
            <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Apresentação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {presentations.map((presentation) => (
            <Card key={presentation.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base line-clamp-1">{presentation.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(presentation.period_start), 'dd/MM', { locale: ptBR })} - {format(new Date(presentation.period_end), 'dd/MM/yyyy', { locale: ptBR })}
                    </CardDescription>
                  </div>
                  {getStatusBadge(presentation.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {presentation.view_count} visualizações
                  </div>
                </div>

                {presentation.executive_summary && (
                  <div className="flex items-center gap-2 text-xs text-green-600">
                    <Sparkles className="w-3 h-3" />
                    Análise por IA disponível
                  </div>
                )}

                <div className="flex gap-2">
                  {presentation.public_token && presentation.status === 'published' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(`/resultados/${presentation.public_token}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Abrir
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyLink(presentation.public_token!)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </>
                  )}

                  {presentation.status !== 'published' && (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => publishMutation.mutate(presentation.id)}
                      disabled={publishMutation.isPending}
                    >
                      <TrendingUp className="w-4 h-4 mr-1" />
                      Publicar
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Tem certeza que deseja excluir esta apresentação?')) {
                        deleteMutation.mutate(presentation.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
