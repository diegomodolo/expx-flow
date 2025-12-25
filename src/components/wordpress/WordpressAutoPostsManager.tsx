import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Settings,
  Calendar,
  Clock,
  RefreshCw,
  Trash2,
  Edit,
  Eye,
  Send,
  FileText,
  ExternalLink,
  Loader2,
  ChevronLeft,
  Plus,
  Globe,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useWordpressAutoPostConfigById,
  useWordpressAutoPostsByConfigId,
  WordpressAutoPost,
} from '@/hooks/useWordpressAutoPostsById';
import { useWordpressSites } from '@/hooks/useWordpressSites';

interface WordpressAutoPostsManagerProps {
  configId: string;
  companyId: string;
}

const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function WordpressAutoPostsManager({ configId, companyId }: WordpressAutoPostsManagerProps) {
  const navigate = useNavigate();
  
  const { config, isLoading: configLoading, updateConfig, deleteConfig, isUpdating } = useWordpressAutoPostConfigById(configId);
  const { sites } = useWordpressSites(companyId);
  const {
    pendingPosts,
    publishedPosts,
    nextPost,
    isLoading: postsLoading,
    regeneratePost,
    generateNextPost,
    deletePost,
    updatePost,
    publishNow,
    isRegenerating,
    isGeneratingNext,
    isPublishing,
  } = useWordpressAutoPostsByConfigId(configId);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    post_briefing: '',
    post_type: 'post',
    post_status: 'draft',
    post_category: '',
    scheduled_days: [] as number[],
    scheduled_hours: [] as number[],
    wordpress_site_id: '',
  });
  const [editingPost, setEditingPost] = useState<WordpressAutoPost | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');

  useEffect(() => {
    if (config) {
      setEditForm({
        post_briefing: config.post_briefing,
        post_type: config.post_type || 'post',
        post_status: config.post_status || 'draft',
        post_category: config.post_category || '',
        scheduled_days: config.scheduled_days || [],
        scheduled_hours: config.scheduled_hours || [],
        wordpress_site_id: config.wordpress_site_id || '',
      });
    }
  }, [config]);

  const handleSaveConfig = async () => {
    await updateConfig(editForm);
    setIsEditing(false);
  };

  const handleDeleteConfig = async () => {
    await deleteConfig();
    navigate('/automatizadores/wordpress');
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    await updateConfig({ is_enabled: enabled });
  };

  const handleToggleDay = (day: number) => {
    const newDays = editForm.scheduled_days.includes(day)
      ? editForm.scheduled_days.filter(d => d !== day)
      : [...editForm.scheduled_days, day].sort((a, b) => a - b);
    setEditForm({ ...editForm, scheduled_days: newDays });
  };

  const handleToggleHour = (hour: number) => {
    const newHours = editForm.scheduled_hours.includes(hour)
      ? editForm.scheduled_hours.filter(h => h !== hour)
      : [...editForm.scheduled_hours, hour].sort((a, b) => a - b);
    setEditForm({ ...editForm, scheduled_hours: newHours });
  };

  const handleSavePostEdit = async () => {
    if (!editingPost) return;
    await updatePost({
      postId: editingPost.id,
      updates: { title: editedTitle, content: editedContent },
    });
    setEditingPost(null);
  };

  const formatScheduledDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  if (configLoading || postsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Configuração não encontrada</p>
        <Button className="mt-4" onClick={() => navigate('/automatizadores/wordpress')}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/automatizadores/wordpress')}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{config.name || 'Automação WordPress'}</h1>
            <p className="text-muted-foreground text-sm">
              {config.wordpress_sites?.name} • {config.wordpress_sites?.site_url}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch checked={config.is_enabled} onCheckedChange={handleToggleEnabled} />
            <span className="text-sm">{config.is_enabled ? 'Ativo' : 'Pausado'}</span>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Automação?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Todos os posts pendentes serão excluídos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfig} className="bg-destructive text-destructive-foreground">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configuração
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
              <Edit className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label>Site WordPress</Label>
                  <Select
                    value={editForm.wordpress_site_id}
                    onValueChange={(value) => setEditForm({ ...editForm, wordpress_site_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um site" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((site) => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Briefing do Conteúdo</Label>
                  <Textarea
                    value={editForm.post_briefing}
                    onChange={(e) => setEditForm({ ...editForm, post_briefing: e.target.value })}
                    rows={4}
                    placeholder="Descreva o tipo de conteúdo..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={editForm.post_type}
                      onValueChange={(value) => setEditForm({ ...editForm, post_type: value })}
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
                    <Label>Status</Label>
                    <Select
                      value={editForm.post_status}
                      onValueChange={(value) => setEditForm({ ...editForm, post_status: value })}
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
                    value={editForm.post_category}
                    onChange={(e) => setEditForm({ ...editForm, post_category: e.target.value })}
                    placeholder="Nome da categoria"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Dias da Semana</Label>
                  <div className="flex flex-wrap gap-2">
                    {dayNames.map((day, index) => (
                      <Button
                        key={index}
                        variant={editForm.scheduled_days.includes(index) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleToggleDay(index)}
                      >
                        {day}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Horários</Label>
                  <div className="flex flex-wrap gap-2">
                    {[6, 8, 10, 12, 14, 16, 18, 20].map((hour) => (
                      <Button
                        key={hour}
                        variant={editForm.scheduled_hours.includes(hour) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleToggleHour(hour)}
                      >
                        {hour}h
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1" onClick={handleSaveConfig} disabled={isUpdating}>
                    {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Salvar
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span>{config.wordpress_sites?.name}</span>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Briefing</p>
                  <p className="text-sm">{config.post_briefing}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Tipo</p>
                    <Badge variant="secondary">{config.post_type}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <Badge variant="secondary">
                      {config.post_status === 'publish' ? 'Publicar' : 'Rascunho'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Dias
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {config.scheduled_days.map((day) => (
                      <Badge key={day} variant="outline" className="text-xs">
                        {dayNames[day]}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Horários
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {config.scheduled_hours.map((hour) => (
                      <Badge key={hour} variant="outline" className="text-xs">
                        {hour}h
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Posts Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Next Post Card */}
          {nextPost && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Próximo Post
                </CardTitle>
                <CardDescription>
                  Agendado para {formatScheduledDate(nextPost.scheduled_at)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {editingPost?.id === nextPost.id ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Conteúdo (HTML)</Label>
                      <Textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        rows={10}
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSavePostEdit}>Salvar</Button>
                      <Button variant="outline" onClick={() => setEditingPost(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {nextPost.featured_image_url && (
                      <img
                        src={nextPost.featured_image_url}
                        alt="Featured"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    )}
                    <h3 className="text-xl font-semibold">{nextPost.title}</h3>
                    {nextPost.excerpt && (
                      <p className="text-muted-foreground">{nextPost.excerpt}</p>
                    )}
                    <ScrollArea className="h-32 border rounded-lg p-3">
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: nextPost.content }}
                      />
                    </ScrollArea>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingPost(nextPost);
                          setEditedTitle(nextPost.title);
                          setEditedContent(nextPost.content);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => regeneratePost(nextPost.id)}
                        disabled={isRegenerating}
                      >
                        {isRegenerating ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Regenerar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => publishNow(nextPost.id)}
                        disabled={isPublishing}
                      >
                        {isPublishing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Publicar Agora
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deletePost(nextPost.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Generate Button */}
          <Button
            className="w-full"
            onClick={() => generateNextPost()}
            disabled={isGeneratingNext}
          >
            {isGeneratingNext ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Gerar Novo Post
          </Button>

          {/* Pending Posts */}
          {pendingPosts.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Posts Pendentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingPosts.slice(1).map((post) => (
                    <div key={post.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{post.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatScheduledDate(post.scheduled_at)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deletePost(post.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Published Posts */}
          {publishedPosts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Posts Publicados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {publishedPosts.slice(0, 10).map((post) => (
                    <div key={post.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{post.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Publicado em {post.published_at ? formatScheduledDate(post.published_at) : '-'}
                        </p>
                      </div>
                      {post.wordpress_post_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(post.wordpress_post_url!, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
