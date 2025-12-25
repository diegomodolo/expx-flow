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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useInstagramAutoPostConfig, useInstagramAutoPosts } from '@/hooks/useInstagramAutoPosts';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { InstagramPostPreviewModal } from '@/components/instagram/InstagramPostPreviewModal';
import { AutoPostReferenceImages } from '@/components/instagram/AutoPostReferenceImages';
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
  History,
  Send,
  Eye,
  ChevronDown,
  ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
  const { pendingPosts, nextPost, publishedPosts, isLoading: postsLoading, regeneratePost, generateNextPost, deletePost, updateCaption, publishNow, isRegenerating, isGeneratingNext, isDeleting, isUpdatingCaption, isPublishing } = useInstagramAutoPosts(clientId!);

  // Form state for new config
  const [briefing, setBriefing] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [selectedHours, setSelectedHours] = useState<number[]>([12, 18]);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState('');
  const [previewPost, setPreviewPost] = useState<{ imageUrl: string; caption: string } | null>(null);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [editBriefing, setEditBriefing] = useState('');
  const [editDays, setEditDays] = useState<number[]>([]);
  const [editHours, setEditHours] = useState<number[]>([]);
  const [newConfigRefImages, setNewConfigRefImages] = useState<{
    reference_image_1?: string | null;
    reference_image_2?: string | null;
    reference_image_3?: string | null;
  }>({});
  
  // Collapsible sections state - only "Postagens Agendadas" starts open
  const [configOpen, setConfigOpen] = useState(false);
  const [refImagesOpen, setRefImagesOpen] = useState(false);
  const [pendingPostsOpen, setPendingPostsOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
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
      created_by: user?.id!,
      reference_image_1: newConfigRefImages.reference_image_1,
      reference_image_2: newConfigRefImages.reference_image_2,
      reference_image_3: newConfigRefImages.reference_image_3
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

            {/* Reference Images for new config */}
            {activeCompany && (
              <AutoPostReferenceImages
                clientId={clientId!}
                companyId={activeCompany.company_id}
                referenceImage1={newConfigRefImages.reference_image_1 || null}
                referenceImage2={newConfigRefImages.reference_image_2 || null}
                referenceImage3={newConfigRefImages.reference_image_3 || null}
                onImagesChange={(updates) => setNewConfigRefImages(prev => ({ ...prev, ...updates }))}
              />
            )}

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
      <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configuração Atual
                  <ChevronDown className={cn("w-4 h-4 transition-transform", configOpen && "rotate-180")} />
                </CardTitle>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {!isEditingConfig && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditBriefing(config.post_briefing);
                        setEditDays(config.scheduled_days);
                        setEditHours(config.scheduled_hours);
                        setIsEditingConfig(true);
                        setConfigOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {isEditingConfig ? (
                <>
                  {/* Edit Briefing */}
                  <div className="space-y-2">
                    <Label>Briefing das Postagens</Label>
                    <Textarea
                      value={editBriefing}
                      onChange={(e) => setEditBriefing(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>

                  {/* Edit Days */}
                  <div className="space-y-2">
                    <Label>Dias da Semana</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map(day => (
                        <button
                          key={day.value}
                          onClick={() => setEditDays(prev => 
                            prev.includes(day.value) 
                              ? prev.filter(d => d !== day.value)
                              : [...prev, day.value].sort((a, b) => a - b)
                          )}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            editDays.includes(day.value)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Edit Hours */}
                  <div className="space-y-2">
                    <Label>Horários de Publicação</Label>
                    <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-2 border rounded-md">
                      {HOURS.map(hour => (
                        <button
                          key={hour.value}
                          onClick={() => setEditHours(prev => 
                            prev.includes(hour.value) 
                              ? prev.filter(h => h !== hour.value)
                              : [...prev, hour.value].sort((a, b) => a - b)
                          )}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            editHours.includes(hour.value)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          {hour.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Save/Cancel buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => {
                        updateConfig({
                          post_briefing: editBriefing,
                          scheduled_days: editDays,
                          scheduled_hours: editHours
                        });
                        setIsEditingConfig(false);
                      }}
                      disabled={isUpdating || editDays.length === 0 || editHours.length === 0 || !editBriefing.trim()}
                    >
                      {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Salvar Alterações
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditingConfig(false)}>
                      Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                <>
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
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {config.scheduled_hours.sort((a, b) => a - b).map(hour => (
                          <Badge key={hour} variant="secondary" className="text-xs">
                            {String(hour).padStart(2, '0')}:00
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Reference Images Section */}
      <Collapsible open={refImagesOpen} onOpenChange={setRefImagesOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ImageIcon className="w-5 h-5" />
                  Imagens de Referência para IA
                  <ChevronDown className={cn("w-4 h-4 transition-transform", refImagesOpen && "rotate-180")} />
                </CardTitle>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <AutoPostReferenceImages
                configId={config.id}
                clientId={clientId!}
                companyId={config.company_id}
                referenceImage1={config.reference_image_1}
                referenceImage2={config.reference_image_2}
                referenceImage3={config.reference_image_3}
                onImagesChange={(updates) => updateConfig(updates)}
                disabled={isUpdating}
                isInline
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Pending Posts Queue */}
      <Collapsible open={pendingPostsOpen} onOpenChange={setPendingPostsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Postagens Agendadas
                    <ChevronDown className={cn("w-4 h-4 transition-transform", pendingPostsOpen && "rotate-180")} />
                  </CardTitle>
                  <CardDescription>
                    {pendingPosts.length} post{pendingPosts.length !== 1 ? 's' : ''} na fila
                  </CardDescription>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <Button
                    onClick={() => generateNextPost({ configId: config.id, companyId: config.company_id })}
                    disabled={isGeneratingNext}
                  >
                    {isGeneratingNext ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Image className="w-4 h-4 mr-2" />
                        Gerar Próxima
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
          {pendingPosts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma postagem agendada. Clique em "Gerar Próxima" para criar.
            </p>
          ) : (
            <div className="space-y-4">
              {pendingPosts.map((post, index) => (
                <div key={post.id} className={`p-4 rounded-lg border ${index === 0 ? 'border-primary bg-primary/5' : 'bg-muted/30'}`}>
                  <div className="flex gap-4">
                    {/* Image Preview */}
                    <div className="w-32 h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={post.image_url}
                        alt="Preview do post"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={index === 0 ? 'default' : 'secondary'}>
                          <Clock className="w-3 h-3 mr-1" />
                          {format(new Date(post.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </Badge>
                        {index === 0 && (
                          <Badge variant="outline" className="text-xs">Próxima</Badge>
                        )}
                      </div>
                      
                      <p className="text-sm line-clamp-3">{post.caption}</p>
                      
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setPreviewPost({ imageUrl: post.image_url, caption: post.caption })}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => publishNow(post.id)}
                          disabled={isPublishing}
                        >
                          {isPublishing ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3 mr-1" />
                          )}
                          Publicar Agora
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => regeneratePost({ configId: config.id, postId: post.id })}
                          disabled={isRegenerating}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Regenerar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCaptionText(post.caption);
                            setEditingPostId(post.id);
                          }}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deletePost(post.id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Edit Caption Inline */}
                  {editingPostId === post.id && (
                    <div className="mt-4 space-y-2 border-t pt-4">
                      <Textarea
                        value={captionText}
                        onChange={(e) => setCaptionText(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => {
                          updateCaption({ postId: post.id, caption: captionText });
                          setEditingPostId(null);
                        }} disabled={isUpdatingCaption}>
                          {isUpdatingCaption ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingPostId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Post History */}
      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Histórico de Postagens
                    <ChevronDown className={cn("w-4 h-4 transition-transform", historyOpen && "rotate-180")} />
                  </CardTitle>
                  <CardDescription>
                    Últimas postagens publicadas
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
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
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Instagram Preview Modal */}
      <InstagramPostPreviewModal
        open={!!previewPost}
        onOpenChange={(open) => !open && setPreviewPost(null)}
        imageUrl={previewPost?.imageUrl || ''}
        caption={previewPost?.caption || ''}
        username={instagramAccounts?.[0]?.username || 'usuario'}
        profilePicture={instagramAccounts?.[0]?.profile_picture_url}
      />
    </div>
  );
}
