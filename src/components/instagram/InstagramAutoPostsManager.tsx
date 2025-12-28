import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useInstagramAutoPostConfigById, useInstagramAutoPostsByConfigId } from '@/hooks/useInstagramAutoPostsById';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { InstagramPostPreviewModal } from '@/components/instagram/InstagramPostPreviewModal';
import { AutoPostReferenceImages } from '@/components/instagram/AutoPostReferenceImages';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  ImageIcon,
  Layers,
  ChevronLeft,
  ChevronRight
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

const CAROUSEL_IMAGE_OPTIONS = [
  { value: 5, label: '5 imagens' },
  { value: 6, label: '6 imagens' },
  { value: 7, label: '7 imagens' },
  { value: 8, label: '8 imagens' },
  { value: 9, label: '9 imagens' },
  { value: 10, label: '10 imagens' },
];

interface InstagramAutoPostsManagerProps {
  configId: string;
  clientId?: string | null;
  instagramAccountId: string;
  onBack?: () => void;
}

// Carousel Image Preview Component
function CarouselImagePreview({ imageUrls, onViewFull }: { imageUrls: string[]; onViewFull: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % imageUrls.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
  };

  return (
    <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0 group">
      <img
        src={imageUrls[currentIndex]}
        alt={`Slide ${currentIndex + 1}`}
        className="w-full h-full object-cover cursor-pointer"
        onClick={onViewFull}
      />
      
      {/* Carousel indicator */}
      <div className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1">
        <Layers className="w-3 h-3" />
        {currentIndex + 1}/{imageUrls.length}
      </div>
      
      {/* Navigation arrows */}
      {imageUrls.length > 1 && (
        <>
          <button
            onClick={prevImage}
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
        {imageUrls.slice(0, 5).map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors",
              idx === currentIndex ? "bg-white" : "bg-white/50"
            )}
          />
        ))}
        {imageUrls.length > 5 && (
          <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
        )}
      </div>
    </div>
  );
}

export function InstagramAutoPostsManager({ 
  configId, 
  clientId,
  instagramAccountId,
  onBack 
}: InstagramAutoPostsManagerProps) {
  const { config, isLoading: configLoading, updateConfig, deleteConfig, isUpdating, isDeleting } = useInstagramAutoPostConfigById(configId);
  const { 
    pendingPosts, 
    publishedPosts, 
    isLoading: postsLoading, 
    regeneratePost, 
    generateNextPost, 
    deletePost, 
    updateCaption, 
    publishNow, 
    isRegenerating, 
    isGeneratingNext, 
    isDeleting: isDeletingPost, 
    isUpdatingCaption, 
    isPublishing 
  } = useInstagramAutoPostsByConfigId(configId);

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState('');
  const [previewPost, setPreviewPost] = useState<{ imageUrl: string; caption: string; imageUrls?: string[] } | null>(null);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [editBriefing, setEditBriefing] = useState('');
  const [editDays, setEditDays] = useState<number[]>([]);
  const [editHours, setEditHours] = useState<number[]>([]);
  const [editName, setEditName] = useState('');
  const [editInstagramAccountId, setEditInstagramAccountId] = useState('');
  const [editPostType, setEditPostType] = useState<'single' | 'carousel'>('single');
  const [editCarouselImages, setEditCarouselImages] = useState(5);
  
  // Collapsible sections state
  const [configOpen, setConfigOpen] = useState(false);
  const [refImagesOpen, setRefImagesOpen] = useState(false);
  const [pendingPostsOpen, setPendingPostsOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: instagramAccount } = useQuery({
    queryKey: ['instagram-account', instagramAccountId],
    queryFn: async () => {
      const { data } = await supabase
        .from('instagram_accounts')
        .select('*')
        .eq('id', instagramAccountId)
        .single();
      return data;
    },
    enabled: !!instagramAccountId
  });

  // Fetch all available Instagram accounts for selection
  const { data: availableInstagramAccounts } = useQuery({
    queryKey: ['instagram-accounts-for-config', config?.company_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('instagram_accounts')
        .select('*')
        .eq('company_id', config!.company_id)
        .order('username');
      return data || [];
    },
    enabled: !!config?.company_id
  });

  const handleToggleEnabled = (enabled: boolean) => {
    updateConfig({ is_enabled: enabled });
  };

  if (configLoading || postsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground mb-4">Configuração não encontrada</p>
        {onBack && (
          <Button onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        )}
      </div>
    );
  }

  const postType = (config as any).post_type || 'single';
  const carouselMinImages = (config as any).carousel_min_images || 5;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Instagram className="w-6 h-6" />
              {config.name || `@${instagramAccount?.username || 'Instagram'}`}
              {postType === 'carousel' && (
                <Badge variant="secondary" className="ml-2">
                  <Layers className="w-3 h-3 mr-1" />
                  Carrossel
                </Badge>
              )}
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
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => {
              deleteConfig();
              onBack?.();
            }}
            disabled={isDeleting}
          >
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
                        setEditName(config.name || '');
                        setEditBriefing(config.post_briefing);
                        setEditDays(config.scheduled_days);
                        setEditHours(config.scheduled_hours);
                        setEditInstagramAccountId(instagramAccountId);
                        setEditPostType(postType);
                        setEditCarouselImages(carouselMinImages);
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
                  {/* Edit Name */}
                  <div className="space-y-2">
                    <Label>Nome da Automação</Label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Nome da automação"
                    />
                  </div>

                  {/* Edit Instagram Account */}
                  <div className="space-y-2">
                    <Label>Conta do Instagram</Label>
                    <Select value={editInstagramAccountId} onValueChange={setEditInstagramAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma conta" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableInstagramAccounts?.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-5 h-5">
                                <AvatarImage src={account.profile_picture_url || ''} />
                                <AvatarFallback className="text-xs">
                                  {account.username?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              @{account.username}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Post Type Selection */}
                  <div className="space-y-2">
                    <Label>Tipo de Post</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={editPostType === 'single' ? 'default' : 'outline'}
                        onClick={() => setEditPostType('single')}
                        className="flex-1"
                      >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Imagem Única
                      </Button>
                      <Button
                        type="button"
                        variant={editPostType === 'carousel' ? 'default' : 'outline'}
                        onClick={() => setEditPostType('carousel')}
                        className="flex-1"
                      >
                        <Layers className="w-4 h-4 mr-2" />
                        Carrossel
                      </Button>
                    </div>
                  </div>

                  {/* Carousel Image Count */}
                  {editPostType === 'carousel' && (
                    <div className="space-y-2">
                      <Label>Quantidade de Imagens no Carrossel</Label>
                      <Select 
                        value={String(editCarouselImages)} 
                        onValueChange={(v) => setEditCarouselImages(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CAROUSEL_IMAGE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Mínimo recomendado: 5 imagens para melhor engajamento
                      </p>
                    </div>
                  )}

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
                          name: editName || null,
                          post_briefing: editBriefing,
                          scheduled_days: editDays,
                          scheduled_hours: editHours,
                          instagram_account_id: editInstagramAccountId,
                          post_type: editPostType,
                          carousel_min_images: editCarouselImages,
                          carousel_max_images: editCarouselImages
                        } as any);
                        setIsEditingConfig(false);
                      }}
                      disabled={isUpdating || editDays.length === 0 || editHours.length === 0 || !editBriefing.trim() || !editInstagramAccountId}
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
                  {/* Instagram Account display */}
                  <div>
                    <Label className="text-muted-foreground text-xs">Conta do Instagram</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={instagramAccount?.profile_picture_url || ''} />
                        <AvatarFallback className="text-xs">
                          {instagramAccount?.username?.charAt(0).toUpperCase() || 'I'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">@{instagramAccount?.username || 'Não configurado'}</span>
                    </div>
                  </div>

                  {config.name && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Nome</Label>
                      <p className="text-sm font-medium">{config.name}</p>
                    </div>
                  )}

                  {/* Post Type Display */}
                  <div>
                    <Label className="text-muted-foreground text-xs">Tipo de Post</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {postType === 'carousel' ? (
                        <>
                          <Layers className="w-4 h-4" />
                          <span className="text-sm font-medium">Carrossel ({carouselMinImages} imagens)</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-4 h-4" />
                          <span className="text-sm font-medium">Imagem única</span>
                        </>
                      )}
                    </div>
                  </div>

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
                        {config.scheduled_hours.sort((a: number, b: number) => a - b).map((hour: number) => (
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
                clientId={clientId || undefined}
                instagramAccountId={instagramAccountId}
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
                  {pendingPosts.map((post: any, index: number) => {
                    const isCarousel = post.post_type === 'carousel' && post.image_urls && post.image_urls.length > 1;
                    
                    return (
                      <div key={post.id} className={`p-4 rounded-lg border ${index === 0 ? 'border-primary bg-primary/5' : 'bg-muted/30'}`}>
                        <div className="flex gap-4">
                          {/* Image Preview - Carousel or Single */}
                          {isCarousel ? (
                            <CarouselImagePreview 
                              imageUrls={post.image_urls} 
                              onViewFull={() => setPreviewPost({ 
                                imageUrl: post.image_urls[0], 
                                caption: post.caption,
                                imageUrls: post.image_urls
                              })}
                            />
                          ) : (
                            <div className="w-32 h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              <img
                                src={post.image_url}
                                alt="Preview do post"
                                className="w-full h-full object-cover cursor-pointer"
                                onClick={() => setPreviewPost({ imageUrl: post.image_url, caption: post.caption })}
                              />
                            </div>
                          )}

                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant={index === 0 ? 'default' : 'secondary'}>
                                  <Clock className="w-3 h-3 mr-1" />
                                  {format(new Date(post.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                </Badge>
                                {isCarousel && (
                                  <Badge variant="outline">
                                    <Layers className="w-3 h-3 mr-1" />
                                    {post.image_urls.length} imagens
                                  </Badge>
                                )}
                              </div>
                              {index === 0 && (
                                <Badge variant="outline" className="text-xs">Próxima</Badge>
                              )}
                            </div>
                            
                            <p className="text-sm line-clamp-3">{post.caption}</p>
                            
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setPreviewPost({ 
                                  imageUrl: post.image_url, 
                                  caption: post.caption,
                                  imageUrls: isCarousel ? post.image_urls : undefined
                                })}
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
                                disabled={isDeletingPost}
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
                    );
                  })}
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
                  {publishedPosts.slice(0, 10).map((post: any) => {
                    const isCarousel = post.post_type === 'carousel' && post.image_urls && post.image_urls.length > 1;
                    
                    return (
                      <div key={post.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                        <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0 relative">
                          <img
                            src={post.image_url}
                            alt="Post publicado"
                            className="w-full h-full object-cover"
                          />
                          {isCarousel && (
                            <div className="absolute top-0.5 right-0.5 bg-black/60 text-white text-[10px] px-1 rounded flex items-center">
                              <Layers className="w-2.5 h-2.5 mr-0.5" />
                              {post.image_urls.length}
                            </div>
                          )}
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
                    );
                  })}
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
        username={instagramAccount?.username || 'usuario'}
        profilePicture={instagramAccount?.profile_picture_url}
        imageUrls={previewPost?.imageUrls}
      />
    </div>
  );
}
