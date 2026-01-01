import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Settings, Edit, Loader2, Image, Images, Facebook, Rss } from 'lucide-react';

interface FacebookPage {
  id: string;
  page_name: string;
  page_id: string;
}

interface ConfigSectionProps {
  config: {
    name: string | null;
    post_briefing: string;
    single_post_prompt: string | null;
    carousel_prompt: string | null;
    rss_feed_prompt?: string | null;
    also_post_to_facebook?: boolean;
    facebook_page_id?: string | null;
  };
  instagramAccount: {
    username: string;
    profile_picture_url: string | null;
  } | null;
  instagramAccountId: string;
  availableInstagramAccounts: Array<{
    id: string;
    username: string;
    profile_picture_url: string | null;
  }>;
  availableFacebookPages?: FacebookPage[];
  selectedFacebookPage?: FacebookPage | null;
  onUpdateConfig: (updates: { 
    name?: string | null; 
    post_briefing?: string; 
    single_post_prompt?: string;
    carousel_prompt?: string;
    rss_feed_prompt?: string;
    instagram_account_id?: string;
    also_post_to_facebook?: boolean;
    facebook_page_id?: string | null;
  }) => void;
  isUpdating: boolean;
}

export function ConfigSection({
  config,
  instagramAccount,
  instagramAccountId,
  availableInstagramAccounts,
  availableFacebookPages = [],
  selectedFacebookPage,
  onUpdateConfig,
  isUpdating,
}: ConfigSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSinglePrompt, setEditSinglePrompt] = useState('');
  const [editCarouselPrompt, setEditCarouselPrompt] = useState('');
  const [editRssFeedPrompt, setEditRssFeedPrompt] = useState('');
  const [editInstagramAccountId, setEditInstagramAccountId] = useState('');
  const [editAlsoPostToFacebook, setEditAlsoPostToFacebook] = useState(false);
  const [editFacebookPageId, setEditFacebookPageId] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      setEditName(config.name || '');
      setEditSinglePrompt(config.single_post_prompt || config.post_briefing || '');
      setEditCarouselPrompt(config.carousel_prompt || config.post_briefing || '');
      setEditRssFeedPrompt(config.rss_feed_prompt || '');
      setEditInstagramAccountId(instagramAccountId);
      setEditAlsoPostToFacebook(config.also_post_to_facebook || false);
      setEditFacebookPageId(config.facebook_page_id || null);
    }
  }, [config, instagramAccountId]);

  const handleSave = () => {
    onUpdateConfig({
      name: editName || null,
      single_post_prompt: editSinglePrompt,
      carousel_prompt: editCarouselPrompt,
      rss_feed_prompt: editRssFeedPrompt,
      instagram_account_id: editInstagramAccountId,
      also_post_to_facebook: editAlsoPostToFacebook,
      facebook_page_id: editAlsoPostToFacebook ? editFacebookPageId : null,
    });
    setIsEditing(false);
  };

  const singlePromptDisplay = config.single_post_prompt || config.post_briefing || 'Nenhum prompt definido';
  const carouselPromptDisplay = config.carousel_prompt || config.post_briefing || 'Nenhum prompt definido';
  const rssFeedPromptDisplay = config.rss_feed_prompt || 'Nenhum prompt definido';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuração
          </CardTitle>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
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

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Image className="w-4 h-4 text-primary" />
                Prompt para Postagem Única
              </Label>
              <Textarea
                value={editSinglePrompt}
                onChange={(e) => setEditSinglePrompt(e.target.value)}
                className="min-h-[100px]"
                placeholder="Descreva o estilo, tom e conteúdo para postagens de imagem única..."
              />
              <p className="text-xs text-muted-foreground">
                Este prompt será usado ao gerar posts com uma única imagem
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Images className="w-4 h-4 text-primary" />
                Prompt para Carrossel
              </Label>
              <Textarea
                value={editCarouselPrompt}
                onChange={(e) => setEditCarouselPrompt(e.target.value)}
                className="min-h-[100px]"
                placeholder="Descreva o estilo, tom e conteúdo para carrosséis (múltiplas imagens)..."
              />
              <p className="text-xs text-muted-foreground">
                Este prompt será usado ao gerar carrosséis com múltiplos slides
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Rss className="w-4 h-4 text-orange-500" />
                Prompt para Feed RSS
              </Label>
              <Textarea
                value={editRssFeedPrompt}
                onChange={(e) => setEditRssFeedPrompt(e.target.value)}
                className="min-h-[100px]"
                placeholder="Descreva o estilo e estrutura para posts gerados a partir de notícias do feed RSS..."
              />
              <p className="text-xs text-muted-foreground">
                Este prompt será usado EXCLUSIVAMENTE ao gerar posts a partir do feed RSS. O conteúdo virá da notícia - use este campo para definir estilo visual e estrutura.
              </p>
            </div>

            {/* Cross-posting to Facebook */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Facebook className="w-4 h-4 text-blue-600" />
                  <Label>Postar também no Facebook</Label>
                </div>
                <Switch
                  checked={editAlsoPostToFacebook}
                  onCheckedChange={setEditAlsoPostToFacebook}
                />
              </div>
              
              {editAlsoPostToFacebook && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Página do Facebook</Label>
                  <Select 
                    value={editFacebookPageId || ''} 
                    onValueChange={(value) => setEditFacebookPageId(value || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma página" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFacebookPages.map((page) => (
                        <SelectItem key={page.id} value={page.id}>
                          {page.page_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableFacebookPages.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Nenhuma página do Facebook conectada. Conecte uma página nas configurações de integração.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={isUpdating || (!editSinglePrompt.trim() && !editCarouselPrompt.trim()) || !editInstagramAccountId}
              >
                {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Salvar Alterações
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancelar
              </Button>
            </div>
          </>
        ) : (
          <>
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

            <div className="space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Image className="w-4 h-4 text-primary" />
                  <Label className="text-xs font-medium">Prompt para Postagem Única</Label>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">{singlePromptDisplay}</p>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Images className="w-4 h-4 text-primary" />
                  <Label className="text-xs font-medium">Prompt para Carrossel</Label>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">{carouselPromptDisplay}</p>
              </div>

              <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-1">
                  <Rss className="w-4 h-4 text-orange-500" />
                  <Label className="text-xs font-medium text-orange-700 dark:text-orange-300">Prompt para Feed RSS</Label>
                </div>
                <p className="text-sm text-orange-600 dark:text-orange-400 line-clamp-3">{rssFeedPromptDisplay}</p>
              </div>

              {/* Display Facebook cross-posting status */}
              {config.also_post_to_facebook && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <Facebook className="w-4 h-4 text-blue-600" />
                    <Label className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      Também postando no Facebook
                    </Label>
                  </div>
                  {selectedFacebookPage && (
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                      {selectedFacebookPage.page_name}
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
