import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Globe, ArrowRight, ChevronLeft, Loader2, Calendar, Clock } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/hooks/useAuth';
import { useWordpressSites } from '@/hooks/useWordpressSites';
import { AddWordpressSiteDialog } from '@/components/wordpress/AddWordpressSiteDialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function AutomatizadoresWordpress() {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showAddSiteDialog, setShowAddSiteDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const [newConfig, setNewConfig] = useState({
    name: '',
    wordpress_site_id: '',
    post_briefing: '',
    post_type: 'post',
    post_status: 'draft',
    post_category: '',
    scheduled_days: [1, 2, 3, 4, 5] as number[],
    scheduled_hours: [10] as number[],
  });

  const { sites, isLoading: sitesLoading } = useWordpressSites(currentCompany?.id || '');

  // Fetch all wordpress configs
  const { data: configs, isLoading: configsLoading } = useQuery({
    queryKey: ['wordpress-auto-post-configs', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wordpress_auto_post_configs')
        .select(`
          *,
          wordpress_sites (
            id,
            name,
            site_url
          )
        `)
        .eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  const createConfigMutation = useMutation({
    mutationFn: async () => {
      // Create the config
      const { data: config, error: configError } = await supabase
        .from('wordpress_auto_post_configs')
        .insert({
          ...newConfig,
          company_id: currentCompany!.id,
          created_by: user!.id,
        })
        .select()
        .single();

      if (configError) throw configError;

      // Generate first post
      try {
        await supabase.functions.invoke('generate-wordpress-auto-post', {
          body: {
            configId: config.id,
            companyId: currentCompany!.id,
          },
        });
      } catch (e) {
        console.warn('Failed to generate first post:', e);
      }

      return config;
    },
    onSuccess: (config) => {
      queryClient.invalidateQueries({ queryKey: ['wordpress-auto-post-configs'] });
      setShowCreateDialog(false);
      setNewConfig({
        name: '',
        wordpress_site_id: '',
        post_briefing: '',
        post_type: 'post',
        post_status: 'draft',
        post_category: '',
        scheduled_days: [1, 2, 3, 4, 5],
        scheduled_hours: [10],
      });
      toast.success('Automação criada com sucesso!');
      navigate(`/automatizadores/wordpress/${config.id}`);
    },
    onError: (error: any) => {
      console.error('Error creating config:', error);
      toast.error('Erro ao criar automação');
    },
  });

  const handleToggleDay = (day: number) => {
    const newDays = newConfig.scheduled_days.includes(day)
      ? newConfig.scheduled_days.filter(d => d !== day)
      : [...newConfig.scheduled_days, day].sort((a, b) => a - b);
    setNewConfig({ ...newConfig, scheduled_days: newDays });
  };

  const handleToggleHour = (hour: number) => {
    const newHours = newConfig.scheduled_hours.includes(hour)
      ? newConfig.scheduled_hours.filter(h => h !== hour)
      : [...newConfig.scheduled_hours, hour].sort((a, b) => a - b);
    setNewConfig({ ...newConfig, scheduled_hours: newHours });
  };

  const isLoading = sitesLoading || configsLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/automatizadores')}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Automatizadores WordPress</h1>
              <p className="text-muted-foreground mt-1">
                Publique artigos automaticamente no seu blog
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAddSiteDialog(true)}>
              <Globe className="w-4 h-4 mr-2" />
              Gerenciar Sites
            </Button>
            <Button onClick={() => setShowCreateDialog(true)} disabled={sites.length === 0}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Automação
            </Button>
          </div>
        </div>

        {/* Sites Warning */}
        {!isLoading && sites.length === 0 && (
          <Card className="border-yellow-500/50 bg-yellow-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Globe className="w-8 h-8 text-yellow-500" />
                <div className="flex-1">
                  <p className="font-medium">Nenhum site WordPress configurado</p>
                  <p className="text-sm text-muted-foreground">
                    Adicione um site WordPress para começar a criar automações.
                  </p>
                </div>
                <Button onClick={() => setShowAddSiteDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Site
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Configs Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : configs && configs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {configs.map((config) => (
              <Card
                key={config.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
                onClick={() => navigate(`/automatizadores/wordpress/${config.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Globe className="w-5 h-5 text-primary" />
                    </div>
                    <Badge variant={config.is_enabled ? 'default' : 'secondary'}>
                      {config.is_enabled ? 'Ativo' : 'Pausado'}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">
                    {config.name || 'Automação WordPress'}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {config.post_briefing}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {config.wordpress_sites?.name}
                    </span>
                    <div className="flex items-center text-primary font-medium">
                      Ver detalhes
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sites.length > 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Globe className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Nenhuma automação criada</p>
              <p className="text-sm text-muted-foreground mb-4">
                Crie sua primeira automação para publicar artigos automaticamente.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Automação
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Add Site Dialog */}
      <AddWordpressSiteDialog
        open={showAddSiteDialog}
        onOpenChange={setShowAddSiteDialog}
        companyId={currentCompany?.id || ''}
      />

      {/* Create Automation Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Automação WordPress</DialogTitle>
            <DialogDescription>
              Configure a publicação automática de artigos no seu blog.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Automação</Label>
              <Input
                placeholder="Ex: Blog de Marketing"
                value={newConfig.name}
                onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Site WordPress</Label>
              <Select
                value={newConfig.wordpress_site_id}
                onValueChange={(value) => setNewConfig({ ...newConfig, wordpress_site_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name} ({site.site_url})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Briefing do Conteúdo</Label>
              <Textarea
                placeholder="Ex: Artigos sobre dicas de marketing digital para pequenas empresas..."
                value={newConfig.post_briefing}
                onChange={(e) => setNewConfig({ ...newConfig, post_briefing: e.target.value })}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={newConfig.post_type}
                  onValueChange={(value) => setNewConfig({ ...newConfig, post_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post">Post</SelectItem>
                    <SelectItem value="page">Página</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status ao Publicar</Label>
                <Select
                  value={newConfig.post_status}
                  onValueChange={(value) => setNewConfig({ ...newConfig, post_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="publish">Publicar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categoria (opcional)</Label>
              <Input
                placeholder="Nome da categoria no WordPress"
                value={newConfig.post_category}
                onChange={(e) => setNewConfig({ ...newConfig, post_category: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Dias da Semana
              </Label>
              <div className="flex flex-wrap gap-2">
                {dayNames.map((day, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant={newConfig.scheduled_days.includes(index) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleToggleDay(index)}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horários
              </Label>
              <div className="flex flex-wrap gap-2">
                {[6, 8, 10, 12, 14, 16, 18, 20].map((hour) => (
                  <Button
                    key={hour}
                    type="button"
                    variant={newConfig.scheduled_hours.includes(hour) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleToggleHour(hour)}
                  >
                    {hour}h
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createConfigMutation.mutate()}
              disabled={
                !newConfig.name ||
                !newConfig.wordpress_site_id ||
                !newConfig.post_briefing ||
                newConfig.scheduled_days.length === 0 ||
                newConfig.scheduled_hours.length === 0 ||
                createConfigMutation.isPending
              }
            >
              {createConfigMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar Automação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
