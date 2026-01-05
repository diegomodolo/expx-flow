import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Lightbulb, Plus, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCompany } from '@/contexts/CompanyContext';

interface ThemesSectionProps {
  configId: string;
  clientId?: string;
}

interface MarketResearchInsight {
  id: string;
  topic: string;
  pain_point: string | null;
  sentiment: string | null;
  source_type: string;
  relevance_score: number | null;
}

export function ThemesSection({ configId, clientId }: ThemesSectionProps) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const [newTopic, setNewTopic] = useState('');
  const [newPainPoint, setNewPainPoint] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Fetch themes for this client
  const { data: themes, isLoading, refetch } = useQuery({
    queryKey: ['instagram-autopost-themes', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('market_research_insights')
        .select('id, topic, pain_point, sentiment, source_type, relevance_score')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as MarketResearchInsight[];
    },
    enabled: !!clientId
  });

  // Add new theme
  const addThemeMutation = useMutation({
    mutationFn: async () => {
      if (!clientId || !activeCompany?.company_id) {
        throw new Error('Cliente ou empresa não encontrados');
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('market_research_insights')
        .insert({
          client_id: clientId,
          company_id: activeCompany.company_id,
          user_id: userData.user.id,
          topic: newTopic,
          pain_point: newPainPoint || null,
          source_type: 'manual',
          sentiment: 'neutral'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tema adicionado com sucesso');
      setNewTopic('');
      setNewPainPoint('');
      setIsAdding(false);
      queryClient.invalidateQueries({ queryKey: ['instagram-autopost-themes', clientId] });
    },
    onError: (error) => {
      toast.error('Erro ao adicionar tema: ' + error.message);
    }
  });

  // Delete theme
  const deleteThemeMutation = useMutation({
    mutationFn: async (themeId: string) => {
      const { error } = await supabase
        .from('market_research_insights')
        .delete()
        .eq('id', themeId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tema removido');
      queryClient.invalidateQueries({ queryKey: ['instagram-autopost-themes', clientId] });
    },
    onError: (error) => {
      toast.error('Erro ao remover tema: ' + error.message);
    }
  });

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-500/10 text-green-500';
      case 'negative': return 'bg-red-500/10 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSentimentLabel = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive': return 'Positivo';
      case 'negative': return 'Negativo';
      default: return 'Neutro';
    }
  };

  if (!clientId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">
            Nenhum cliente vinculado a esta automação.
          </p>
          <p className="text-sm text-muted-foreground">
            Vá em <strong>Configuração</strong> e vincule um cliente para poder gerenciar os temas de conteúdo.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Temas de Pesquisa
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={() => setIsAdding(true)} disabled={isAdding}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Tema
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Os temas abaixo serão utilizados como inspiração para gerar os criativos automaticamente. 
            A IA escolherá um tema aleatório de cada vez para criar conteúdo variado.
          </p>

          {isAdding && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="pt-4 space-y-3">
                <div>
                  <Input
                    placeholder="Título do tema (ex: Benefícios do produto X)"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                  />
                </div>
                <div>
                  <Textarea
                    placeholder="Descrição ou pontos a abordar (opcional)"
                    value={newPainPoint}
                    onChange={(e) => setNewPainPoint(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => addThemeMutation.mutate()}
                    disabled={!newTopic.trim() || addThemeMutation.isPending}
                  >
                    {addThemeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Adicionar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => {
                      setIsAdding(false);
                      setNewTopic('');
                      setNewPainPoint('');
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {themes && themes.length === 0 ? (
            <div className="text-center py-8">
              <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">Nenhum tema configurado</p>
              <p className="text-sm text-muted-foreground">
                Adicione temas para que a IA possa gerar criativos variados
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {themes?.map((theme) => (
                <Card key={theme.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{theme.topic}</h4>
                        {theme.pain_point && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {theme.pain_point}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className={getSentimentColor(theme.sentiment)}>
                            {getSentimentLabel(theme.sentiment)}
                          </Badge>
                          {theme.relevance_score && (
                            <Badge variant="secondary">
                              Relevância: {theme.relevance_score}%
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive hover:text-destructive"
                        onClick={() => deleteThemeMutation.mutate(theme.id)}
                        disabled={deleteThemeMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
