import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useInstagramAutoPostConfig, useInstagramAutoPosts } from '@/hooks/useInstagramAutoPosts';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { 
  Instagram, 
  Calendar, 
  Clock, 
  Image, 
  RefreshCw, 
  Edit, 
  Loader2, 
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Trash2,
  Settings,
  History
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, '0')}:00`
}));

export default function InstagramAutoPostsPage() {
  const { id: clientId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const { user } = useAuth();

  const { config, isLoading: configLoading, createConfig, updateConfig, deleteConfig, isCreating, isUpdating } = useInstagramAutoPostConfig(clientId!);
  const { nextPost, publishedPosts, isLoading: postsLoading, regeneratePost, updateCaption, isRegenerating, isUpdatingCaption } = useInstagramAutoPosts(clientId!);

  // Form state for new config
  const [briefing, setBriefing] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [selectedHours, setSelectedHours] = useState<number[]>([12, 18]);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState('');

  // Fetch Instagram accounts
  const { data: instagramAccounts } = useQuery({
    queryKey: ['instagram-accounts', clientId],
    queryFn: async () => {
      const { data: client } = await supabase
        .from('clients')
        .select('instagram_account_id')
        .eq('id', clientId!)
        .single();

      if (!client?.instagram_account_id) return [];

      const { data: accounts } = await supabase
        .from('instagram_accounts')
        .select('*')
        .eq('id', client.instagram_account_id);

      return accounts || [];
    },
    enabled: !!clientId
  });

  const handleCreateConfig = () => {
    if (!briefing.trim() || !selectedAccount || selectedDays.length === 0 || selectedHours.length === 0) {
      return;
    }

    createConfig({
      instagram_account_id: selectedAccount,
      post_briefing: briefing,
      scheduled_days: selectedDays,
      scheduled_hours: selectedHours,
      company_id: activeCompany?.company_id!,
      created_by: user?.id!
    });
  };

  const handleToggleEnabled = (enabled: boolean) => {
    updateConfig({ is_enabled: enabled });
  };

  const handleDayToggle = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    );
  };

  const handleHourToggle = (hour: number) => {
    setSelectedHours(prev => 
      prev.includes(hour) 
        ? prev.filter(h => h !== hour)
        : [...prev, hour].sort((a, b) => a - b)
    );
  };

  const handleSaveCaption = () => {
    if (nextPost && captionText.trim()) {
      updateCaption({ postId: nextPost.id, caption: captionText });
      setEditingCaption(false);
    }
  };

  const handleStartEditCaption = () => {
    if (nextPost) {
      setCaptionText(nextPost.caption);
      setEditingCaption(true);
    }
  };

  if (configLoading || postsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No config yet - show setup form
  if (!config) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Instagram className="w-6 h-6" />
              Postagens Automáticas
            </h1>
            <p className="text-muted-foreground">Configure postagens automáticas no Instagram</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configurar Postagens Automáticas</CardTitle>
            <CardDescription>
              Configure o briefing e horários para geração e publicação automática de posts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Instagram Account Selection */}
            <div className="space-y-2">
              <Label>Conta do Instagram</Label>
              {instagramAccounts && instagramAccounts.length > 0 ? (
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {instagramAccounts.map((account: any) => (
                      <SelectItem key={account.id} value={account.id}>
                        @{account.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma conta do Instagram vinculada a este cliente.
                </p>
              )}
            </div>

            {/* Briefing */}
            <div className="space-y-2">
              <Label>Briefing das Postagens</Label>
              <Textarea
                value={briefing}
                onChange={(e) => setBriefing(e.target.value)}
                placeholder="Descreva o tipo de conteúdo que deseja nas postagens automáticas. Ex: Posts promocionais sobre delivery de pizza, destacando rapidez e qualidade..."
                className="min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                Este briefing será combinado com o briefing do cliente para gerar posts personalizados.
              </p>
            </div>

            {/* Days Selection */}
            <div className="space-y-2">
              <Label>Dias da Semana</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map(day => (
                  <button
                    key={day.value}
                    onClick={() => handleDayToggle(day.value)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      selectedDays.includes(day.value)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hours Selection */}
            <div className="space-y-2">
              <Label>Horários de Publicação</Label>
              <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-md">
                {HOURS.map(hour => (
                  <button
                    key={hour.value}
                    onClick={() => handleHourToggle(hour.value)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      selectedHours.includes(hour.value)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {hour.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Selecione os horários em que deseja publicar. Máximo recomendado: 3 por dia.
              </p>
            </div>

            <Button
              onClick={handleCreateConfig}
              disabled={isCreating || !briefing.trim() || !selectedAccount || selectedDays.length === 0 || selectedHours.length === 0}
              className="w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ativando...
                </>
              ) : (
                <>
                  <Instagram className="w-4 h-4 mr-2" />
                  Ativar Postagens Automáticas
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Config exists - show management view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Instagram className="w-6 h-6" />
              Postagens Automáticas
            </h1>
            <p className="text-muted-foreground">Gerencie posts automáticos do Instagram</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="enabled" className="text-sm">
              {config.is_enabled ? 'Ativo' : 'Inativo'}
            </Label>
            <Switch
              id="enabled"
              checked={config.is_enabled}
              onCheckedChange={handleToggleEnabled}
              disabled={isUpdating}
            />
          </div>
          <Button variant="destructive" size="sm" onClick={() => deleteConfig()}>
            <Trash2 className="w-4 h-4 mr-2" />
            Remover
          </Button>
        </div>
      </div>

      {/* Config Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuração Atual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-muted-foreground text-xs">Briefing</Label>
            <p className="text-sm">{config.post_briefing}</p>
          </div>
          <div className="flex gap-6">
            <div>
              <Label className="text-muted-foreground text-xs">Dias</Label>
              <div className="flex gap-1 mt-1">
                {DAYS_OF_WEEK.map(day => (
                  <Badge
                    key={day.value}
                    variant={config.scheduled_days.includes(day.value) ? 'default' : 'outline'}
                    className="text-xs"
                  >
                    {day.label}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Horários</Label>
              <div className="flex gap-1 mt-1">
                {config.scheduled_hours.sort((a, b) => a - b).map(hour => (
                  <Badge key={hour} variant="secondary" className="text-xs">
                    {String(hour).padStart(2, '0')}:00
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Post Preview */}
      {nextPost && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Próxima Postagem
              <Badge variant="outline" className="ml-auto">
                <Clock className="w-3 h-3 mr-1" />
                {format(new Date(nextPost.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              {/* Image Preview */}
              <div className="w-64 h-64 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                <img
                  src={nextPost.image_url}
                  alt="Preview do post"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Caption */}
              <div className="flex-1 space-y-4">
                {editingCaption ? (
                  <div className="space-y-2">
                    <Textarea
                      value={captionText}
                      onChange={(e) => setCaptionText(e.target.value)}
                      className="min-h-[150px]"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveCaption} disabled={isUpdatingCaption}>
                        {isUpdatingCaption ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingCaption(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap">{nextPost.caption}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => regeneratePost(config.id)}
                        disabled={isRegenerating}
                      >
                        {isRegenerating ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Regenerar
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleStartEditCaption}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar Legenda
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Post History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Postagens
          </CardTitle>
          <CardDescription>
            Últimas postagens publicadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {publishedPosts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma postagem publicada ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {publishedPosts.slice(0, 10).map(post => (
                <div key={post.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                    <img
                      src={post.image_url}
                      alt="Post publicado"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{post.caption.slice(0, 80)}...</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Publicado em {format(new Date(post.published_at!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    {post.status === 'published' ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Publicado
                      </Badge>
                    ) : post.status === 'failed' ? (
                      <Badge variant="destructive">
                        <XCircle className="w-3 h-3 mr-1" />
                        Falhou
                      </Badge>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
