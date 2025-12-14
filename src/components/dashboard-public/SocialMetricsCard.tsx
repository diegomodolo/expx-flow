import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Instagram, Heart, MessageCircle, TrendingUp, ExternalLink, Image } from "lucide-react";
import { SocialMetrics } from "@/hooks/useClientDashboard";
import { cn } from "@/lib/utils";

interface SocialMetricsCardProps {
  socialMetrics: SocialMetrics;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString('pt-BR');
}

export function SocialMetricsCard({ socialMetrics }: SocialMetricsCardProps) {
  if (!socialMetrics?.instagram && !socialMetrics?.facebook) {
    return null;
  }

  const instagram = socialMetrics.instagram;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Instagram className="h-5 w-5 text-pink-500" />
          Performance do Instagram
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {instagram && (
          <>
            {/* Profile Header */}
            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <Avatar className="h-14 w-14 ring-2 ring-pink-500/20">
                <AvatarImage src={instagram.profile_picture_url} alt={instagram.username} />
                <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-500 text-white">
                  {instagram.username?.charAt(0)?.toUpperCase() || 'I'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <a 
                    href={`https://instagram.com/${instagram.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1"
                  >
                    @{instagram.username}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="font-medium text-foreground">{formatNumber(instagram.followers_count)}</span> seguidores
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="font-medium text-foreground">{formatNumber(instagram.posts_count)}</span> posts
                  </span>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-red-500 mb-1">
                  <Heart className="h-4 w-4 fill-current" />
                </div>
                <div className="text-xl font-bold text-foreground">{formatNumber(instagram.total_likes)}</div>
                <div className="text-xs text-muted-foreground">Curtidas</div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div className="text-xl font-bold text-foreground">{formatNumber(instagram.total_comments)}</div>
                <div className="text-xs text-muted-foreground">Comentários</div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="text-xl font-bold text-foreground">{instagram.avg_engagement.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Engaj. Médio</div>
              </div>
            </div>

            {/* Recent Posts Grid */}
            {instagram.recent_posts && instagram.recent_posts.length > 0 && (
              <div className="pt-2">
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Image className="h-4 w-4" />
                  Posts Recentes
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {instagram.recent_posts.slice(0, 6).map((post) => (
                    <a
                      key={post.id}
                      href={post.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative group aspect-square rounded-lg overflow-hidden bg-secondary"
                    >
                      <img
                        src={post.thumbnail_url || post.media_url}
                        alt={post.caption?.slice(0, 50) || 'Instagram post'}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.svg';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white text-xs">
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3 fill-current" />
                          {formatNumber(post.like_count)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {formatNumber(post.comments_count)}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Top Post */}
            {instagram.top_post && (
              <div className="pt-2 border-t border-border">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">🏆 Post com Melhor Engajamento</h4>
                <a
                  href={instagram.top_post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <img
                    src={instagram.top_post.thumbnail_url || instagram.top_post.media_url}
                    alt="Top post"
                    className="w-16 h-16 rounded-lg object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-red-500">
                        <Heart className="h-4 w-4 fill-current" />
                        {formatNumber(instagram.top_post.like_count)}
                      </span>
                      <span className="flex items-center gap-1 text-blue-500">
                        <MessageCircle className="h-4 w-4" />
                        {formatNumber(instagram.top_post.comments_count)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatNumber(instagram.top_post.like_count + instagram.top_post.comments_count)} interações totais
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
