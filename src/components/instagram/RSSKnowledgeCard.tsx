import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Rss, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle,
  Loader2,
  Sparkles,
  CheckCircle2,
  ImageIcon,
  LayoutGrid
} from 'lucide-react';
import { useRSSKnowledge } from '@/hooks/useRSSKnowledge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RSSKnowledgeCardProps {
  configId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isStandalone?: boolean;
}

export function RSSKnowledgeCard({ 
  configId, 
  open = false, 
  onOpenChange,
  isStandalone = false 
}: RSSKnowledgeCardProps) {
  const [feedUrl, setFeedUrl] = useState('');
  const [feedName, setFeedName] = useState('');
  const [expandedFeeds, setExpandedFeeds] = useState<Set<string>>(new Set());
  const [generatingItemId, setGeneratingItemId] = useState<string | null>(null);
  
  const {
    feeds,
    items,
    selectedCount,
    enabledFeedsCount,
    isLoadingFeeds,
    isLoadingItems,
    addFeed,
    isAddingFeed,
    removeFeed,
    isRemovingFeed,
    toggleFeed,
    toggleItem,
    updateFeedConfig,
    generatePost,
    isGeneratingPost,
    refreshFeeds,
    isRefreshingFeeds
  } = useRSSKnowledge(configId);

  const handleAddFeed = async () => {
    if (!feedUrl.trim()) return;
    
    try {
      await addFeed({ feedUrl: feedUrl.trim(), feedName: feedName.trim() || undefined });
      setFeedUrl('');
      setFeedName('');
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && feedUrl.trim()) {
      e.preventDefault();
      handleAddFeed();
    }
  };

  const toggleFeedExpanded = (feedId: string) => {
    setExpandedFeeds(prev => {
      const next = new Set(prev);
      if (next.has(feedId)) {
        next.delete(feedId);
      } else {
        next.add(feedId);
      }
      return next;
    });
  };

  const getItemsForFeed = (feedId: string) => {
    return items.filter(item => item.feed_id === feedId);
  };

  const handleGeneratePost = async (itemId: string) => {
    setGeneratingItemId(itemId);
    try {
      await generatePost(itemId);
    } finally {
      setGeneratingItemId(null);
    }
  };

  const cardContent = (
    <>
      {/* Add Feed Section */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="URL do Feed RSS"
            value={feedUrl}
            onChange={(e) => setFeedUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button 
            onClick={handleAddFeed} 
            disabled={!feedUrl.trim() || isAddingFeed}
            size="sm"
          >
            {isAddingFeed ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
        <Input
          placeholder="Nome do feed (opcional)"
          value={feedName}
          onChange={(e) => setFeedName(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {enabledFeedsCount} feed{enabledFeedsCount !== 1 ? 's' : ''} ativo{enabledFeedsCount !== 1 ? 's' : ''}, {selectedCount} item{selectedCount !== 1 ? 's' : ''} selecionado{selectedCount !== 1 ? 's' : ''}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshFeeds()}
          disabled={isRefreshingFeeds || feeds.length === 0}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshingFeeds && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      <Separator />

      {/* Feeds List */}
      {isLoadingFeeds ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : feeds.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Rss className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Nenhum feed RSS cadastrado</p>
          <p className="text-sm">Adicione feeds para importar conteúdo automaticamente</p>
        </div>
      ) : (
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-3">
            {feeds.map((feed) => {
              const feedItems = getItemsForFeed(feed.id);
              const selectedFeedItems = feedItems.filter(i => i.is_selected);
              const generatedCount = feedItems.filter(i => i.post_generated).length;
              const isExpanded = expandedFeeds.has(feed.id);
              
              return (
                <Card key={feed.id} className={cn(!feed.is_enabled && "opacity-60")}>
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Checkbox
                          checked={feed.is_enabled}
                          onCheckedChange={(checked) => 
                            toggleFeed({ feedId: feed.id, isEnabled: !!checked })
                          }
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm truncate">
                              {feed.feed_name || new URL(feed.feed_url).hostname}
                            </h4>
                            {feed.last_error && (
                              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {feed.feed_url}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              {selectedFeedItems.length}/{feedItems.length} selecionados
                            </Badge>
                            {generatedCount > 0 && (
                              <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {generatedCount} gerado{generatedCount !== 1 ? 's' : ''}
                              </Badge>
                            )}
                            {feed.last_checked_at && (
                              <span className="text-xs text-muted-foreground">
                                Atualizado {formatDistanceToNow(new Date(feed.last_checked_at), { 
                                  addSuffix: true, 
                                  locale: ptBR 
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleFeedExpanded(feed.id)}
                        >
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform",
                            isExpanded && "rotate-180"
                          )} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeFeed(feed.id)}
                          disabled={isRemovingFeed}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {feed.last_error && (
                      <p className="text-xs text-destructive mt-2">
                        Erro: {feed.last_error}
                      </p>
                    )}
                    
                    {/* Feed Configuration */}
                    <div className="mt-3 pt-3 border-t space-y-3">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs whitespace-nowrap">Tipo de Post:</Label>
                          <Select
                            value={feed.post_type}
                            onValueChange={(value: 'single' | 'carousel') => 
                              updateFeedConfig({ feedId: feed.id, postType: value })
                            }
                          >
                            <SelectTrigger className="h-8 w-[130px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="single">
                                <div className="flex items-center gap-2">
                                  <ImageIcon className="h-3 w-3" />
                                  Imagem Única
                                </div>
                              </SelectItem>
                              <SelectItem value="carousel">
                                <div className="flex items-center gap-2">
                                  <LayoutGrid className="h-3 w-3" />
                                  Carrossel
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {feed.post_type === 'carousel' && (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs whitespace-nowrap">Slides:</Label>
                            <Select
                              value={String(feed.carousel_images)}
                              onValueChange={(value) => 
                                updateFeedConfig({ feedId: feed.id, carouselImages: parseInt(value) })
                              }
                            >
                              <SelectTrigger className="h-8 w-[70px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          id={`auto-generate-${feed.id}`}
                          checked={feed.auto_generate}
                          onCheckedChange={(checked) =>
                            updateFeedConfig({ feedId: feed.id, autoGenerate: checked })
                          }
                        />
                        <Label 
                          htmlFor={`auto-generate-${feed.id}`} 
                          className="text-xs cursor-pointer"
                        >
                          Gerar automaticamente quando chegar notícia
                        </Label>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {isExpanded && feedItems.length > 0 && (
                    <CardContent className="py-2 px-4 border-t">
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {feedItems.slice(0, 30).map((item) => (
                          <div 
                            key={item.id}
                            className="flex items-start gap-3 py-2 border-b last:border-0"
                          >
                            <Checkbox
                              checked={item.is_selected}
                              onCheckedChange={(checked) =>
                                toggleItem({ itemId: item.id, isSelected: !!checked })
                              }
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2">
                                <h5 className="text-sm font-medium line-clamp-2 flex-1">
                                  {item.title}
                                </h5>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {item.post_generated ? (
                                    <Badge variant="outline" className="text-xs text-green-600 border-green-300 gap-1">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Gerado
                                    </Badge>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs gap-1"
                                      onClick={() => handleGeneratePost(item.id)}
                                      disabled={isGeneratingPost || generatingItemId === item.id}
                                    >
                                      {generatingItemId === item.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Sparkles className="h-3 w-3" />
                                      )}
                                      Gerar
                                    </Button>
                                  )}
                                  <a
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-primary p-1"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              </div>
                              {item.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                  {item.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                {item.published_at && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(item.published_at), { 
                                      addSuffix: true, 
                                      locale: ptBR 
                                    })}
                                  </span>
                                )}
                                {item.generated_at && (
                                  <span className="text-xs text-green-600">
                                    · Gerado {formatDistanceToNow(new Date(item.generated_at), { 
                                      addSuffix: true, 
                                      locale: ptBR 
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {feedItems.length > 30 && (
                          <p className="text-xs text-center text-muted-foreground py-2">
                            +{feedItems.length - 30} itens adicionais
                          </p>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </>
  );

  if (isStandalone) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rss className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-lg">Feeds RSS</CardTitle>
            </div>
            <Badge variant="outline">{selectedCount} selecionados</Badge>
          </div>
          <CardDescription>
            Adicione feeds RSS para gerar posts automaticamente a partir de notícias
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cardContent}
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Rss className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-lg">Feeds RSS</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedCount} selecionados</Badge>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  open && "rotate-180"
                )} />
              </div>
            </div>
            <CardDescription>
              Adicione feeds RSS para gerar posts automaticamente a partir de notícias
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {cardContent}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}