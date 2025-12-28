import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Instagram, 
  Facebook, 
  Users, 
  Heart, 
  MessageCircle, 
  TrendingUp, 
  Eye,
  MousePointerClick,
  UserPlus,
  ExternalLink,
  Share2,
  AlertCircle
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSocialMetrics } from "@/hooks/useSocialMetrics";
import { useClientContext } from "./ClienteContext";
import { SocialTimelineChart } from "@/components/social/SocialTimelineChart";
import { FollowersGrowthChart } from "@/components/social/FollowersGrowthChart";
import { ComparisonCard } from "@/components/social/ComparisonCard";
import { InstagramFeedPreview } from "@/components/social/InstagramFeedPreview";
import { useQueryClient } from "@tanstack/react-query";

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString('pt-BR');
}

export function ClienteRedesSociais() {
  const { client } = useClientContext();
  const clientId = client?.id || '';
  const { data, isLoading, error, refetch, isFetching } = useSocialMetrics(clientId);
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Share2 className="h-6 w-6 text-primary" />
          <h1 className="text-title-lg text-foreground">Redes Sociais</h1>
        </div>
        <Skeleton className="h-[120px] rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[300px] rounded-xl" />
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[400px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  const socialMetrics = data?.social_metrics;
  const hasNoSocialAccounts = !socialMetrics?.instagram && !socialMetrics?.facebook;

  if (error || hasNoSocialAccounts) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Share2 className="h-6 w-6 text-primary" />
          <h1 className="text-title-lg text-foreground">Redes Sociais</h1>
        </div>
        <Card className="bg-card border-0 shadow-google-sm rounded-xl p-8">
          <div className="flex flex-col items-center justify-center text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-title-md text-foreground mb-2">Nenhuma rede social configurada</h3>
            <p className="text-body-md text-muted-foreground max-w-md">
              Este cliente não possui conta do Instagram ou Página do Facebook vinculadas. 
              Configure as contas na seção "Contato & Dados" para visualizar as métricas.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const instagram = socialMetrics?.instagram;
  const facebook = socialMetrics?.facebook;
  const hasTimeline = instagram?.timeline && instagram.timeline.reach.length > 0;
  const hasComparison = instagram?.comparison;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Share2 className="h-6 w-6 text-primary" />
        <h1 className="text-title-lg text-foreground">Redes Sociais</h1>
      </div>

      {/* Comparison Card - Full Width */}
      {hasComparison && instagram?.comparison && (
        <ComparisonCard data={instagram.comparison} />
      )}

      {/* Timeline Charts */}
      {hasTimeline && instagram?.timeline && (
        <div className="grid gap-6 lg:grid-cols-2">
          <SocialTimelineChart
            reachData={instagram.timeline.reach}
            engagedData={instagram.timeline.accounts_engaged}
            title="Alcance e Engajamento (30 dias)"
          />
          <FollowersGrowthChart
            data={instagram.timeline.follower_count}
            title="Variação de Seguidores (30 dias)"
          />
        </div>
      )}

      {/* Instagram & Facebook Summary Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Instagram Card */}
        {instagram && (
          <Card className="bg-card border-0 shadow-google-sm rounded-xl overflow-hidden">
            {/* Instagram Header */}
            <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-4 ring-white/30">
                  <AvatarImage src={instagram.profile_picture_url} alt={instagram.username} />
                  <AvatarFallback className="bg-white/20 text-white text-title-md">
                    {instagram.username?.charAt(0)?.toUpperCase() || 'I'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Instagram className="h-5 w-5 text-white" />
                    <a 
                      href={`https://instagram.com/${instagram.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-title-md text-white hover:underline flex items-center gap-1"
                    >
                      @{instagram.username}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  <p className="text-white/80 text-body-sm mt-1">
                    {formatNumber(instagram.followers_count)} seguidores
                  </p>
                </div>
              </div>
            </div>

            {/* Instagram Metrics */}
            <div className="p-4 space-y-4">
              {/* Main Metrics */}
              <div>
                <h3 className="text-label-md text-muted-foreground uppercase tracking-wider mb-3">Engajamento</h3>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard 
                    icon={Heart} 
                    iconColor="text-destructive" 
                    bgColor="bg-destructive/10"
                    value={formatNumber(instagram.total_likes)} 
                    label="Total de Curtidas" 
                  />
                  <MetricCard 
                    icon={MessageCircle} 
                    iconColor="text-primary" 
                    bgColor="bg-primary/10"
                    value={formatNumber(instagram.total_comments)} 
                    label="Total de Comentários" 
                  />
                  <MetricCard 
                    icon={TrendingUp} 
                    iconColor="text-success" 
                    bgColor="bg-success/10"
                    value={instagram.avg_engagement.toFixed(2) + '%'} 
                    label="Engajamento Médio" 
                  />
                  <MetricCard 
                    icon={Users} 
                    iconColor="text-pink-500" 
                    bgColor="bg-pink-500/10"
                    value={formatNumber(instagram.followers_count)} 
                    label="Seguidores" 
                  />
                </div>
              </div>

              {/* Insights */}
              {(instagram.reach || instagram.impressions || instagram.profile_views || instagram.website_clicks) && (
                <div>
                  <h3 className="text-label-md text-muted-foreground uppercase tracking-wider mb-3">Insights (30 dias)</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard 
                      icon={Eye} 
                      iconColor="text-purple-500" 
                      bgColor="bg-purple-500/10"
                      value={formatNumber(instagram.reach || 0)} 
                      label="Alcance" 
                    />
                    <MetricCard 
                      icon={TrendingUp} 
                      iconColor="text-cyan-500" 
                      bgColor="bg-cyan-500/10"
                      value={formatNumber(instagram.impressions || 0)} 
                      label="Impressões" 
                    />
                    <MetricCard 
                      icon={UserPlus} 
                      iconColor="text-indigo-500" 
                      bgColor="bg-indigo-500/10"
                      value={formatNumber(instagram.profile_views || 0)} 
                      label="Visitas ao Perfil" 
                    />
                    <MetricCard 
                      icon={MousePointerClick} 
                      iconColor="text-warning" 
                      bgColor="bg-warning/10"
                      value={formatNumber(instagram.website_clicks || 0)} 
                      label="Cliques no Link" 
                    />
                  </div>
                </div>
              )}

              {/* Top Posts */}
              {instagram.top_posts && instagram.top_posts.length > 0 && (
                <div>
                  <h3 className="text-label-md text-muted-foreground uppercase tracking-wider mb-3">
                    Top Posts por Engajamento
                  </h3>
                  <div className="space-y-2">
                    {instagram.top_posts.slice(0, 6).map((post) => (
                      <a
                        key={post.id}
                        href={post.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                          {post.thumbnail_url ? (
                            <img src={post.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Instagram className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-body-sm text-foreground truncate">
                            {post.caption?.substring(0, 50) || 'Sem legenda'}
                            {(post.caption?.length || 0) > 50 && '...'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Heart className="h-3.5 w-3.5" />
                            <span className="text-label-sm">{formatNumber(post.like_count)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span className="text-label-sm">{formatNumber(post.comments_count)}</span>
                          </div>
                          <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Facebook Card */}
        {facebook && (
          <Card className="bg-card border-0 shadow-google-sm rounded-xl overflow-hidden">
            {/* Facebook Header */}
            <div className="bg-primary p-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                  <Facebook className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-title-md text-white">{facebook.page_name}</span>
                  </div>
                  {facebook.page_category && (
                    <p className="text-white/80 text-body-sm mt-1">
                      {facebook.page_category}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Facebook Metrics */}
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-label-md text-muted-foreground uppercase tracking-wider mb-3">Métricas da Página</h3>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard 
                    icon={Users} 
                    iconColor="text-primary" 
                    bgColor="bg-primary/10"
                    value={formatNumber(facebook.followers_count || 0)} 
                    label="Seguidores" 
                  />
                  <MetricCard 
                    icon={Eye} 
                    iconColor="text-purple-500" 
                    bgColor="bg-purple-500/10"
                    value={formatNumber(facebook.page_impressions || 0)} 
                    label="Impressões" 
                  />
                  <MetricCard 
                    icon={TrendingUp} 
                    iconColor="text-success" 
                    bgColor="bg-success/10"
                    value={formatNumber(facebook.page_engaged_users || 0)} 
                    label="Usuários Engajados" 
                  />
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Feed Previews - Instagram and Facebook side by side */}
      {((instagram?.recent_posts && instagram.recent_posts.length > 0) ||
        (instagram?.top_posts && instagram.top_posts.length > 0)) && (
        <div className="grid gap-6 lg:grid-cols-2">
          <InstagramFeedPreview
            posts={instagram?.recent_posts || instagram?.top_posts || []}
            username={instagram?.username || ''}
            profilePicture={instagram?.profile_picture_url}
            followersCount={instagram?.followers_count || 0}
            onRefresh={() => refetch()}
            isRefreshing={isFetching}
          />
          {/* Facebook Feed */}
          {facebook && (
            <Card className="bg-card border-0 shadow-google-sm rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Facebook className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <span className="text-title-sm text-foreground font-medium">Feed do Facebook</span>
                    <p className="text-body-sm text-muted-foreground">{facebook.page_name}</p>
                  </div>
                </div>
              </div>
              {facebook.recent_posts && facebook.recent_posts.length > 0 ? (
                <div className="p-4 grid grid-cols-2 gap-3">
                  {facebook.recent_posts.slice(0, 6).map((post) => (
                    <a
                      key={post.id}
                      href={post.permalink_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-square rounded-lg overflow-hidden bg-muted"
                    >
                      {post.full_picture ? (
                        <img src={post.full_picture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10">
                          <Facebook className="h-8 w-8 text-primary/50" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                        <div className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          <span className="text-sm">{post.likes_count}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4" />
                          <span className="text-sm">{post.comments_count}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
                  <Facebook className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-body-sm text-muted-foreground">Nenhum post encontrado</p>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  value: string;
  label: string;
}

function MetricCard({ icon: Icon, iconColor, bgColor, value, label }: MetricCardProps) {
  return (
    <div className={`${bgColor} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className="text-label-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-title-lg text-foreground">{value}</p>
    </div>
  );
}
