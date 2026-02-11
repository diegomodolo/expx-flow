import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Image, Video, Film, Images, Loader2, X } from 'lucide-react';
import { ImageUploader } from '@/components/ui/image-uploader';
import { FaFacebook, FaInstagram } from 'react-icons/fa';
import { useScheduledPosts, ScheduledPost, CreateScheduledPostInput } from '@/hooks/useScheduledPosts';
import { FacebookPage, InstagramAccount } from '@/hooks/useFacebookPages';
import { useClients } from '@/hooks/useClients';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ClientCombobox } from './ClientCombobox';
import { MediaUploader } from './MediaUploader';

interface NewPostModalProps {
  open: boolean;
  onClose: () => void;
  post?: ScheduledPost | null;
  initialDate?: Date | null;
  pages: FacebookPage[];
  instagramAccounts: InstagramAccount[];
  // Props para pré-preenchimento (vindo do gerador de criativos)
  initialMediaUrls?: string[];
  initialCaption?: string;
  initialClientId?: string;
  initialThumbnailUrl?: string;
}

type ContentType = 'image' | 'video' | 'carousel' | 'reel';

const contentTypes: { value: ContentType; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'image', label: 'Imagem', icon: Image, description: 'Post de imagem única' },
  { value: 'video', label: 'Vídeo', icon: Video, description: 'Post de vídeo' },
  { value: 'carousel', label: 'Carrossel', icon: Images, description: 'Múltiplas imagens/vídeos' },
  { value: 'reel', label: 'Reel', icon: Film, description: 'Vídeo curto vertical' },
];

export const NewPostModal: React.FC<NewPostModalProps> = ({
  open,
  onClose,
  post,
  initialDate,
  pages,
  instagramAccounts,
  initialMediaUrls,
  initialCaption,
  initialClientId,
  initialThumbnailUrl,
}) => {
  const { createPost, updatePost } = useScheduledPosts();
  const { clients } = useClients();
  const [loading, setLoading] = useState(false);

  // Form state
  const [contentType, setContentType] = useState<ContentType>('image');
  const [caption, setCaption] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedFacebookPage, setSelectedFacebookPage] = useState<string>('');
  const [selectedInstagramAccount, setSelectedInstagramAccount] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState('12:00');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [collaboratorInput, setCollaboratorInput] = useState('');

  // Get linked accounts for selected client
  const selectedClientData = clients.find(c => c.id === selectedClient);
  const clientFacebookPage = pages.find(p => p.id === selectedClientData?.facebook_page_id);
  const clientInstagramAccount = instagramAccounts.find(a => a.id === selectedClientData?.instagram_account_id);

  // Auto-set accounts when client is selected
  useEffect(() => {
    if (selectedClient && selectedClientData) {
      if (selectedClientData.facebook_page_id) {
        setSelectedFacebookPage(selectedClientData.facebook_page_id);
      }
      if (selectedClientData.instagram_account_id) {
        setSelectedInstagramAccount(selectedClientData.instagram_account_id);
      }
    }
  }, [selectedClient, selectedClientData]);

  // Reset form when opening modal
  useEffect(() => {
    if (open) {
      if (post) {
        // Edit mode
        setContentType(post.content_type);
        setCaption(post.caption || '');
        setMediaUrls(post.media_urls || []);
        setSelectedPlatforms(post.platforms);
        setSelectedFacebookPage(post.facebook_page_id || '');
        setSelectedInstagramAccount(post.instagram_account_id || '');
        setSelectedClient(post.client_id || '');
        setScheduledDate(new Date(post.scheduled_at));
        setScheduledTime(format(new Date(post.scheduled_at), 'HH:mm'));
        setThumbnailUrl(post.thumbnail_url || null);
        setCollaborators((post as any).collaborators || []);
      } else {
        // New post mode - use initial values if provided (from creative generator)
        setContentType('image');
        setCaption(initialCaption || '');
        setMediaUrls(initialMediaUrls || []);
        setSelectedPlatforms([]);
        setSelectedFacebookPage('');
        setSelectedInstagramAccount('');
        setSelectedClient(initialClientId || '');
        setScheduledDate(initialDate || new Date());
        setScheduledTime('12:00');
        setThumbnailUrl(initialThumbnailUrl || null);
        setCollaborators([]);
        setCollaboratorInput('');
      }
    }
  }, [open, post, initialDate, initialMediaUrls, initialCaption, initialClientId, initialThumbnailUrl]);

  // Clear media when content type changes (but not on initial render with prefilled media)
  const [hasInitialMedia] = useState(() => (initialMediaUrls?.length ?? 0) > 0);
  useEffect(() => {
    // Skip clearing media on first content type set if we have initial media
    if (hasInitialMedia && mediaUrls.length > 0 && contentType === 'image') return;
    setMediaUrls([]);
  }, [contentType]);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleSubmit = async () => {
    if (!scheduledDate || mediaUrls.length === 0 || selectedPlatforms.length === 0) {
      return;
    }

    setLoading(true);
    try {
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const scheduledAt = new Date(scheduledDate);
      scheduledAt.setHours(hours, minutes, 0, 0);

      const input: CreateScheduledPostInput = {
        content_type: contentType,
        caption,
        media_urls: mediaUrls,
        platforms: selectedPlatforms,
        facebook_page_id: selectedPlatforms.includes('facebook') ? selectedFacebookPage : null,
        instagram_account_id: selectedPlatforms.includes('instagram') ? selectedInstagramAccount : null,
        client_id: selectedClient || null,
        scheduled_at: scheduledAt.toISOString(),
        status: 'scheduled',
        thumbnail_url: contentType === 'reel' ? thumbnailUrl : null,
        collaborators: selectedPlatforms.includes('instagram') ? collaborators : [],
      };

      if (post) {
        await updatePost(post.id, input);
      } else {
        await createPost(input);
      }

      onClose();
    } finally {
      setLoading(false);
    }
  };

  const isValid = scheduledDate && mediaUrls.length > 0 && selectedPlatforms.length > 0 && selectedClient;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{post ? 'Editar Post' : 'Novo Post Agendado'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Client Selection - FIRST */}
          <div>
            <Label htmlFor="client" className="mb-2 block font-medium">
              Cliente <span className="text-destructive">*</span>
            </Label>
            <ClientCombobox
              clients={clients}
              value={selectedClient}
              onValueChange={setSelectedClient}
              placeholder="Selecione o cliente primeiro"
            />
          </div>

          {/* Linked Accounts Display */}
          {selectedClient && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <FaFacebook className="h-4 w-4 text-blue-600" />
                  <Label className="text-xs text-muted-foreground">Página do Facebook</Label>
                </div>
                {clientFacebookPage ? (
                  <p className="font-medium text-sm">{clientFacebookPage.page_name}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Não vinculada</p>
                )}
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <FaInstagram className="h-4 w-4 text-pink-600" />
                  <Label className="text-xs text-muted-foreground">Conta do Instagram</Label>
                </div>
                {clientInstagramAccount ? (
                  <p className="font-medium text-sm">@{clientInstagramAccount.username}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Não vinculada</p>
                )}
              </div>
            </div>
          )}

          {/* Content Type */}
          <div>
            <Label className="mb-3 block">Tipo de Conteúdo</Label>
            <div className="grid grid-cols-4 gap-2">
              {contentTypes.map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setContentType(type.value)}
                    className={cn(
                      "p-3 rounded-lg border text-center transition-colors",
                      contentType === type.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Icon className={cn(
                      "h-5 w-5 mx-auto mb-1",
                      contentType === type.value ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "text-xs font-medium",
                      contentType === type.value ? "text-primary" : "text-foreground"
                    )}>{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Media Upload */}
          <div>
            <Label className="mb-3 block">Mídia</Label>
            <MediaUploader
              contentType={contentType}
              mediaUrls={mediaUrls}
              onMediaChange={setMediaUrls}
            />
          </div>

          {/* Reels Cover */}
          {contentType === 'reel' && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Film className="w-4 h-4" />
                Capa do Reels
              </Label>
              {thumbnailUrl ? (
                <div className="flex items-start gap-3">
                  <div className="relative group w-20 h-24 rounded-lg overflow-hidden bg-muted border">
                    <img src={thumbnailUrl} alt="Capa do Reels" className="w-full h-full object-cover" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setThumbnailUrl(null)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  <ImageUploader
                    bucket="client-media"
                    folder={`scheduled-posts/covers`}
                    currentImageUrl={thumbnailUrl}
                    onImageUploaded={(url) => setThumbnailUrl(url)}
                    onImageRemoved={() => setThumbnailUrl(null)}
                    compact
                    className="flex-1"
                  />
                </div>
              ) : (
                <ImageUploader
                  bucket="client-media"
                  folder={`scheduled-posts/covers`}
                  onImageUploaded={(url) => setThumbnailUrl(url)}
                  onImageRemoved={() => setThumbnailUrl(null)}
                  compact
                />
              )}
              <p className="text-[10px] text-muted-foreground">
                Imagem que aparecerá como capa do Reels no feed
              </p>
            </div>
          )}

          {/* Caption */}
          <div>
            <Label htmlFor="caption" className="mb-2 block">
              Legenda
              <span className="text-muted-foreground ml-2 text-xs">
                {caption.length}/2200
              </span>
            </Label>
            <Textarea
              id="caption"
              placeholder="Escreva a legenda do post..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              maxLength={2200}
            />
          </div>

          {/* Instagram Collaborators */}
          {selectedPlatforms.includes('instagram') && (
            <div>
              <Label className="mb-2 block">
                Colaboradores (Collab)
                <span className="text-muted-foreground ml-2 text-xs">
                  {collaborators.length}/5
                </span>
              </Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {collaborators.map((collab, index) => (
                  <Badge key={index} variant="secondary" className="gap-1 pr-1">
                    @{collab}
                    <button
                      type="button"
                      onClick={() => setCollaborators(prev => prev.filter((_, i) => i !== index))}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              {collaborators.length < 5 && (
                <Input
                  placeholder="@username e pressione Enter"
                  value={collaboratorInput}
                  onChange={(e) => setCollaboratorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const username = collaboratorInput.replace(/^@/, '').trim();
                      if (username && !collaborators.includes(username)) {
                        setCollaborators(prev => [...prev, username]);
                        setCollaboratorInput('');
                      }
                    }
                  }}
                />
              )}
              <p className="text-[10px] text-muted-foreground mt-1">
                Convide até 5 contas para colaborar no post. O colaborador receberá um convite.
              </p>
            </div>
          )}

          {/* Platforms */}
          <div>
            <Label className="mb-3 block">Plataformas</Label>
            <div className="flex gap-4">
              <label className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors flex-1",
                !clientFacebookPage ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                selectedPlatforms.includes('facebook') 
                  ? "border-blue-500 bg-blue-500/5" 
                  : "border-border"
              )}>
                <Checkbox
                  checked={selectedPlatforms.includes('facebook')}
                  onCheckedChange={() => clientFacebookPage && togglePlatform('facebook')}
                  disabled={!clientFacebookPage}
                />
                <FaFacebook className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Facebook</span>
              </label>

              <label className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors flex-1",
                !clientInstagramAccount ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                selectedPlatforms.includes('instagram') 
                  ? "border-pink-500 bg-pink-500/5" 
                  : "border-border"
              )}>
                <Checkbox
                  checked={selectedPlatforms.includes('instagram')}
                  onCheckedChange={() => clientInstagramAccount && togglePlatform('instagram')}
                  disabled={!clientInstagramAccount}
                />
                <FaInstagram className="h-5 w-5 text-pink-600" />
                <span className="font-medium">Instagram</span>
              </label>
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? (
                      format(scheduledDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
                    ) : (
                      "Selecione a data"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="time" className="mb-2 block">Horário</Label>
              <Input
                id="time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          {/* Preview */}
          {mediaUrls.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <Label className="mb-3 block text-xs text-muted-foreground">Preview</Label>
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={mediaUrls[0]} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm line-clamp-3">{caption || 'Sem legenda'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {selectedPlatforms.map(p => (
                        <Badge key={p} variant="secondary" className="text-xs">
                          {p === 'facebook' ? <FaFacebook className="h-3 w-3 mr-1" /> : <FaInstagram className="h-3 w-3 mr-1" />}
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!isValid || loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {post ? 'Salvar Alterações' : 'Agendar Post'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
