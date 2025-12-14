import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, MessageCircle, ExternalLink, Trophy } from "lucide-react";
import { TopEngagementPost } from "@/hooks/useClientDashboard";

interface TopEngagementPostsCardProps {
  posts: TopEngagementPost[];
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

function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

export function TopEngagementPostsCard({ posts }: TopEngagementPostsCardProps) {
  if (!posts || posts.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card border-0 shadow-google-sm rounded-xl h-full">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center gap-2 text-title-md">
          <Trophy className="h-4 w-4 text-warning" />
          Top Posts por Engajamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 px-4 pb-4">
        {posts.map((post, index) => (
          <a
            key={post.id}
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-2 rounded-lg bg-secondary/40 hover:bg-secondary/70 transition-colors group"
          >
            {/* Ranking Number */}
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-label-sm text-primary">{index + 1}</span>
            </div>

            {/* Thumbnail */}
            <div className="flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden bg-secondary">
              <img
                src={post.thumbnail_url}
                alt="Post thumbnail"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
            </div>

            {/* Caption */}
            <div className="flex-1 min-w-0">
              <p className="text-label-sm text-muted-foreground line-clamp-2">
                {truncateText(post.caption, 50) || 'Sem descrição'}
              </p>
            </div>

            {/* Metrics */}
            <div className="flex-shrink-0 flex items-center gap-2 text-label-sm">
              <span className="flex items-center gap-1 text-destructive">
                <Heart className="h-3 w-3 fill-current" />
                {formatNumber(post.like_count)}
              </span>
              <span className="flex items-center gap-1 text-primary">
                <MessageCircle className="h-3 w-3" />
                {formatNumber(post.comments_count)}
              </span>
              <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </a>
        ))}
      </CardContent>
    </Card>
  );
}
