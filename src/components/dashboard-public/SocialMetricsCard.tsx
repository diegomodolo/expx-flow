import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  ExternalLink
} from "lucide-react";
import { SocialMetrics } from "@/hooks/useClientDashboard";

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
  const facebook = socialMetrics.facebook;

  return (
    <Card className="bg-card border-border p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Instagram Section */}
        {instagram && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-pink-500/20">
                <AvatarImage src={instagram.profile_picture_url} alt={instagram.username} />
                <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-500 text-white text-sm">
                  {instagram.username?.charAt(0)?.toUpperCase() || 'I'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-pink-500 flex-shrink-0" />
                  <a 
                    href={`https://instagram.com/${instagram.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1 truncate"
                  >
                    @{instagram.username}
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  </a>
                </div>
              </div>
            </div>

            {/* Metrics Grid - 4 columns */}
            <div className="grid grid-cols-4 gap-2">
              <MetricItem 
                icon={Users} 
                iconColor="text-pink-500" 
                value={formatNumber(instagram.followers_count)} 
                label="Seguidores" 
              />
              <MetricItem 
                icon={Heart} 
                iconColor="text-red-500" 
                value={formatNumber(instagram.total_likes)} 
                label="Curtidas" 
              />
              <MetricItem 
                icon={MessageCircle} 
                iconColor="text-blue-500" 
                value={formatNumber(instagram.total_comments)} 
                label="Comentários" 
              />
              <MetricItem 
                icon={TrendingUp} 
                iconColor="text-green-500" 
                value={instagram.avg_engagement.toFixed(1)} 
                label="Engaj. Médio" 
              />
            </div>

            {/* Insights Row (if available) */}
            {(instagram.reach || instagram.impressions || instagram.profile_views || instagram.website_clicks) && (
              <div className="grid grid-cols-4 gap-2">
                <MetricItem 
                  icon={Eye} 
                  iconColor="text-purple-500" 
                  value={formatNumber(instagram.reach || 0)} 
                  label="Alcance" 
                  small 
                />
                <MetricItem 
                  icon={TrendingUp} 
                  iconColor="text-green-500" 
                  value={formatNumber(instagram.impressions || 0)} 
                  label="Impressões" 
                  small 
                />
                <MetricItem 
                  icon={UserPlus} 
                  iconColor="text-cyan-500" 
                  value={formatNumber(instagram.profile_views || 0)} 
                  label="Visitas Perfil" 
                  small 
                />
                <MetricItem 
                  icon={MousePointerClick} 
                  iconColor="text-orange-500" 
                  value={formatNumber(instagram.website_clicks || 0)} 
                  label="Cliques Link" 
                  small 
                />
              </div>
            )}
          </div>
        )}

        {/* Facebook Section */}
        {facebook && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                <Facebook className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground truncate">{facebook.page_name}</span>
                </div>
                {facebook.page_category && (
                  <span className="text-xs text-muted-foreground">{facebook.page_category}</span>
                )}
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-2">
              <MetricItem 
                icon={Users} 
                iconColor="text-blue-500" 
                value={formatNumber(facebook.followers_count || 0)} 
                label="Seguidores" 
              />
              <MetricItem 
                icon={Eye} 
                iconColor="text-purple-500" 
                value={formatNumber(facebook.page_impressions || 0)} 
                label="Impressões" 
              />
              <MetricItem 
                icon={TrendingUp} 
                iconColor="text-green-500" 
                value={formatNumber(facebook.page_engaged_users || 0)} 
                label="Engajamento" 
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

interface MetricItemProps {
  icon: React.ElementType;
  iconColor: string;
  value: string;
  label: string;
  small?: boolean;
}

function MetricItem({ icon: Icon, iconColor, value, label, small }: MetricItemProps) {
  return (
    <div className="bg-secondary/50 rounded-lg p-2 text-center">
      <div className={`flex items-center justify-center gap-1 ${iconColor} mb-0.5`}>
        <Icon className={small ? "h-3 w-3" : "h-4 w-4"} />
      </div>
      <div className={`font-bold text-foreground ${small ? "text-sm" : "text-lg"}`}>{value}</div>
      <div className={`text-muted-foreground ${small ? "text-[10px]" : "text-xs"}`}>{label}</div>
    </div>
  );
}
