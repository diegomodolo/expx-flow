import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useInstagramAutoPostConfigById, useInstagramAutoPostsByConfigId } from '@/hooks/useInstagramAutoPostsById';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { InstagramPostPreviewModal } from '@/components/instagram/InstagramPostPreviewModal';
import { YouTubeKnowledgeCard } from '@/components/instagram/YouTubeKnowledgeCard';
import { PDFKnowledgeCard } from '@/components/instagram/PDFKnowledgeCard';
import { InstagramAutoPostLayout } from '@/components/instagram/autopost/InstagramAutoPostLayout';
import { ScheduledPostsSection } from '@/components/instagram/autopost/sections/ScheduledPostsSection';
import { ConfigSection } from '@/components/instagram/autopost/sections/ConfigSection';
import { HistorySection } from '@/components/instagram/autopost/sections/HistorySection';
import { ReferenceImagesSection } from '@/components/instagram/autopost/sections/ReferenceImagesSection';
import { ScheduleSection } from '@/components/instagram/autopost/sections/ScheduleSection';
import { Instagram, ArrowLeft, Trash2, Loader2 } from 'lucide-react';

interface InstagramAutoPostsManagerProps {
  configId: string;
  clientId?: string | null;
  instagramAccountId: string;
  onBack?: () => void;
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

  const [activeSection, setActiveSection] = useState('scheduled-posts');
  const [previewPost, setPreviewPost] = useState<{ imageUrl: string; caption: string; imageUrls?: string[] } | null>(null);

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

  const renderContent = () => {
    switch (activeSection) {
      case 'scheduled-posts':
        return (
          <ScheduledPostsSection
            pendingPosts={pendingPosts}
            onGenerateNext={() => generateNextPost({ configId: config.id, companyId: config.company_id })}
            onPublishNow={publishNow}
            onRegenerate={(postId) => regeneratePost({ configId: config.id, postId })}
            onUpdateCaption={(postId, caption) => updateCaption({ postId, caption })}
            onDelete={deletePost}
            onPreview={(post) => setPreviewPost({ 
              imageUrl: post.image_url, 
              caption: post.caption,
              imageUrls: post.post_type === 'carousel' && post.image_urls ? post.image_urls : undefined
            })}
            isGeneratingNext={isGeneratingNext}
            isPublishing={isPublishing}
            isRegenerating={isRegenerating}
            isUpdatingCaption={isUpdatingCaption}
            isDeletingPost={isDeletingPost}
          />
        );

      case 'config':
        return (
          <ConfigSection
            config={config}
            instagramAccount={instagramAccount}
            instagramAccountId={instagramAccountId}
            availableInstagramAccounts={availableInstagramAccounts || []}
            onUpdateConfig={(updates) => updateConfig(updates as any)}
            isUpdating={isUpdating}
          />
        );

      case 'schedule':
        return <ScheduleSection configId={configId} />;

      case 'reference-images':
        return (
          <ReferenceImagesSection
            configId={config.id}
            clientId={clientId || undefined}
            instagramAccountId={instagramAccountId}
            companyId={config.company_id}
            referenceImage1={config.reference_image_1}
            referenceImage2={config.reference_image_2}
            referenceImage3={config.reference_image_3}
            onImagesChange={(updates) => updateConfig(updates)}
            disabled={isUpdating}
          />
        );

      case 'youtube':
        return (
          <YouTubeKnowledgeCard
            configId={configId}
            isStandalone
          />
        );

      case 'pdf':
        return (
          <PDFKnowledgeCard
            configId={configId}
            companyId={config.company_id}
            isStandalone
          />
        );

      case 'history':
        return <HistorySection publishedPosts={publishedPosts} />;

      default:
        return null;
    }
  };

  const headerActions = (
    <div className="flex items-center gap-3">
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      )}
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
  );

  return (
    <>
      <InstagramAutoPostLayout
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        title={config.name || `@${instagramAccount?.username || 'Instagram'}`}
        subtitle="Gerencie posts automáticos do Instagram"
        headerActions={headerActions}
      >
        {renderContent()}
      </InstagramAutoPostLayout>

      <InstagramPostPreviewModal
        open={!!previewPost}
        onOpenChange={(open) => !open && setPreviewPost(null)}
        imageUrl={previewPost?.imageUrl || ''}
        caption={previewPost?.caption || ''}
        username={instagramAccount?.username || 'usuario'}
        profilePicture={instagramAccount?.profile_picture_url}
        imageUrls={previewPost?.imageUrls}
      />
    </>
  );
}
